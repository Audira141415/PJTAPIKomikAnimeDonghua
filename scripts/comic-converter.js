'use strict';
require('module-alias/register');


/**
 * comic-converter.js — Konverter data Endpoints Comic/ → format internal comic-seed.js
 *
 * Script ini membaca semua JSON dari folder "Endpoints Comic/", mendeteksi
 * format masing-masing file, mengekstrak data manga, melakukan deduplication,
 * dan menghasilkan file data/comics.json siap pakai untuk comic-seed.js.
 *
 * Penggunaan:
 *   node scripts/comic-converter.js
 *   node scripts/comic-converter.js --out data/custom-output.json
 *   node scripts/comic-converter.js --verbose
 */

const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const ENDPOINTS_DIR = path.join(__dirname, '..', 'data', 'raw', 'comic-source');
const args          = process.argv.slice(2);
const getArg        = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const VERBOSE       = args.includes('--verbose');
const OUTPUT_FILE   = path.resolve(getArg('--out') || path.join(__dirname, '..', 'data', 'comics.json'));

// ── File non-manga yang dilewati (nama baru setelah reorganisasi) ─────────────
const SKIP_FILES = new Set([
  'genre-list.json',          // genres/ — katalog genre, bukan list manga
  'health.json',              // stats/ — health check
  'analytics.json',           // stats/ — analytics
  'full.json',                // stats/ — full stats
  'summary.json',             // stats/ — summary stats
  'comparison.json',          // stats/ — comparison
  'realtime.json',            // stats/ — realtime stats
  'chapter-navigation.json',  // chapters/ — navigasi chapter
  'api-docs.json',            // system/ — dokumentasi API lama
  'favorites-placeholder.json', // system/ — placeholder
  'advanced-search.json',     // search/ — response kosong
]);

// ── Mapping status dari format sumber → enum internal ─────────────────────────
const STATUS_MAP = {
  ongoing:    'ongoing',
  'on going': 'ongoing',
  berlanjut:  'ongoing',
  completed:  'completed',
  tamat:      'completed',
  end:        'completed',
  hiatus:     'hiatus',
  dropped:    'cancelled',
  cancelled:  'cancelled',
  upcoming:   'upcoming',
};

// ── Type yang dikenali ────────────────────────────────────────────────────────
const VALID_TYPES = new Set(['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona']);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Ekstrak slug dari berbagai bentuk URL/path komiku.org
 * Contoh input:
 *   "https://komiku.org/manga/the-mirror-legacy/"   → "the-mirror-legacy"
 *   "/manga/the-mirror-legacy/"                     → "the-mirror-legacy"
 *   "/detail-komik/naruto-konohas-story/"           → "naruto-konohas-story"
 */
const extractSlug = (link) => {
  if (!link || typeof link !== 'string') return null;
  const clean = link
    .replace(/^https?:\/\/[^/]+/, '') // hapus domain
    .replace(/[?#].*$/, '')           // hapus query & fragment
    .replace(/\/$/, '');              // hapus trailing slash
  const segments = clean.split('/').filter(Boolean);
  // ["manga", "the-mirror-legacy"] → ambil segment terakhir
  // ["detail-komik", "slug"] → ambil segment terakhir
  return segments.length ? segments[segments.length - 1] : null;
};

/**
 * Parse angka chapter dari string seperti "Chapter 137" atau "Ch.5"
 */
const chapterToNumber = (str) => {
  const m = String(str || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

const normalizeType = (raw) => {
  const t = String(raw || '').toLowerCase().trim();
  if (VALID_TYPES.has(t)) return t;
  // Alias umum
  if (t === 'comic') return 'manga';
  if (t === 'mixed') return 'manga';
  return 'manga'; // default
};

const normalizeStatus = (raw) => {
  const s = String(raw || '').toLowerCase().trim();
  return STATUS_MAP[s] || 'ongoing';
};

/** Bersihkan teks dari karakter aneh, batasi panjang */
const cleanText = (str, max = 5000) =>
  String(str || '').trim().replace(/\s+/g, ' ').slice(0, max);

// ── Detektor format ───────────────────────────────────────────────────────────

/** Format DETAIL: satu manga lengkap dengan metadata & chapters */
const isDetailFormat = (d) =>
  d && typeof d.title === 'string' && d.metadata && typeof d.metadata === 'object' && Array.isArray(d.genres);

/** Format PAGED: hasil paginasi dengan data.results */
const isPagedFormat = (d) =>
  d && d.data && typeof d.data === 'object' && Array.isArray(d.data.results);

/** Format SEARCH: data.data adalah array berisi item dengan slug/href */
const isSearchFormat = (d) =>
  d && Array.isArray(d.data) && d.data.length > 0 && d.data[0] && ('slug' in d.data[0] || 'href' in d.data[0]);

/** Format LIST: memiliki array comics / popular / latest di root */
const isListFormat = (d) =>
  d && (Array.isArray(d.comics) || Array.isArray(d.popular) || Array.isArray(d.latest));

/**
 * Format NUMERIC KEYS: mayoritas key adalah angka "0","1","2"...
 * Tolerasi beberapa string key kecil seperti "creator", "page", "total"
 */
const NUMERIC_META_KEYS = new Set(['creator', 'page', 'total', 'message', 'status', 'url', 'based_on']);
const isNumericFormat = (d) => {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return false;
  const keys = Object.keys(d);
  if (!keys.length) return false;
  const numericKeys = keys.filter((k) => /^\d+$/.test(k));
  const extraKeys   = keys.filter((k) => !(/^\d+$/.test(k)) && !NUMERIC_META_KEYS.has(k));
  return numericKeys.length > 0 && extraKeys.length === 0;
};

/** Format ROOT-RESULTS: {creator, page?, results:[...]} tanpa data wrapper */
const isRootResultsFormat = (d) =>
  d && Array.isArray(d.results) && d.results.length > 0 && !d.data;

/** Format TRENDING: {creator, trending:[...]} */
const isTrendingFormat = (d) => d && Array.isArray(d.trending);

/** Format RECOMMENDATIONS: {creator, recommendations:[...]} */
const isRecommendationsFormat = (d) => d && Array.isArray(d.recommendations);

/** File chapter: judulnya mengandung pola "-chapter-NNN" */
const isChapterFile = (filename) => /chapter-\d+/i.test(filename);

// ── Ekstraktors ───────────────────────────────────────────────────────────────

const fromDetail = (d) => ({
  title:         d.title,
  alterTitle:    d.title_indonesian || null,
  type:          normalizeType(d.metadata?.type),
  status:        normalizeStatus(d.metadata?.status),
  genres:        (d.genres || []).map((g) => (typeof g === 'object' ? g.name : g)).filter(Boolean),
  description:   cleanText(d.synopsis_full || d.synopsis || ''),
  author:        cleanText(d.metadata?.author || 'Unknown', 200),
  artist:        cleanText(d.metadata?.artist || d.metadata?.author || 'Unknown', 200),
  coverImage:    d.image || null,
  releasedOn:    null,
  totalEpisodes: Array.isArray(d.chapters) ? d.chapters.length : null,
  _slug:         d.slug || extractSlug(d.link),
  _priority:     10,
});

const fromPaged = (results) =>
  (results || [])
    .filter((item) => item && item.title)
    .map((item) => ({
      title:         item.title,
      alterTitle:    item.altTitle || null,
      type:          normalizeType(item.type),
      status:        'ongoing',
      genres:        item.genre ? [item.genre] : [],
      description:   cleanText(item.description || ''),
      author:        'Unknown',
      artist:        'Unknown',
      coverImage:    item.thumbnail || item.image || null,
      releasedOn:    null,
      totalEpisodes: chapterToNumber(item.firstChapter?.title || item.chapter),
      _slug:         item.slug || extractSlug(item.detailUrl || item.url || item.link),
      _priority:     6,
    }));

const fromSearch = (items) =>
  (items || [])
    .filter((item) => item && item.title)
    .map((item) => ({
      title:         item.title,
      alterTitle:    item.altTitle || null,
      type:          normalizeType(item.type),
      status:        'ongoing',
      genres:        item.genre ? [item.genre] : [],
      description:   cleanText(item.description || ''),
      author:        'Unknown',
      artist:        'Unknown',
      coverImage:    item.thumbnail || null,
      releasedOn:    null,
      totalEpisodes: null,
      _slug:         item.slug || extractSlug(item.href),
      _priority:     5,
    }));

const fromList = (d, filename) => {
  const all = [
    ...(d.comics  || []),
    ...(d.popular || []),
    ...(d.latest  || []),
  ];
  // genre dari field `genre` di root file (misal action.json → "action")
  const defaultGenre = d.genre || null;

  return all
    .filter((item) => {
      if (!item || !item.title) return false;
      const link = item.link || '';
      // Buang entry iklan Komiku Plus
      if (link === '/plus/' || link.includes('komikuplus') || item.title.includes('Plus APK')) return false;
      return true;
    })
    .map((item) => ({
      title:         item.title,
      alterTitle:    null,
      type:          normalizeType(item.type),
      status:        'ongoing',
      genres:        item.genre
        ? [item.genre]
        : defaultGenre
        ? [defaultGenre]
        : [],
      description:   cleanText(item.description || ''),
      author:        'Unknown',
      artist:        'Unknown',
      coverImage:    item.image || item.thumbnail || null,
      releasedOn:    null,
      totalEpisodes: chapterToNumber(item.chapter),
      _slug:         extractSlug(item.link || item.url),
      _priority:     4,
    }));
};

const fromNumericKeys = (d) =>
  Object.values(d)
    .filter((item) => {
      if (!item || !item.title) return false;
      const link = item.link || '';
      if (link === '/plus/' || link.includes('komikuplus') || item.title.includes('Plus APK')) return false;
      return true;
    })
    .map((item) => ({
      title:         item.title,
      alterTitle:    null,
      type:          normalizeType(item.type),
      status:        'ongoing',
      genres:        [],
      description:   '',
      author:        'Unknown',
      artist:        'Unknown',
      coverImage:    item.image || null,
      releasedOn:    null,
      totalEpisodes: chapterToNumber(item.chapter),
      _slug:         extractSlug(item.link),
      _priority:     3,
    }));

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║    Audira Comic API — Comic Converter                ║');
  console.log('║    Mengkonversi Endpoints Comic/ → format internal   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(ENDPOINTS_DIR)) {
    console.error(`[ERROR] Folder tidak ditemukan: ${ENDPOINTS_DIR}`);
    process.exit(1);
  }

  // ── Rekursif: kumpulkan semua .json dari semua subfolder ──────────────────
  const walkDir = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const result  = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        result.push(...walkDir(full));
      } else if (entry.name.endsWith('.json')) {
        result.push(full);
      }
    }
    return result.sort();
  };

  // files: array absolute path (bukan hanya nama)
  const files = walkDir(ENDPOINTS_DIR);

  console.log(`  Folder  : ${ENDPOINTS_DIR}`);
  console.log(`  Output  : ${OUTPUT_FILE}`);
  console.log(`  Total   : ${files.length} JSON files ditemukan\n`);

  // Map: slug → { ...item, _priority }  — untuk deduplication
  const bySlug   = new Map();
  const noSlugItems = [];
  let totalExtracted = 0;

  for (const filepath of files) {
    const file = path.relative(ENDPOINTS_DIR, filepath); // pakai path relatif untuk display & SKIP check

    // ── Skip non-manga files ──
    const basename = path.basename(filepath);
    if (SKIP_FILES.has(basename)) {
      if (VERBOSE) console.log(`  [SKIP]    ${file}  (file non-manga)`);
      continue;
    }

    if (isChapterFile(basename)) {
      if (VERBOSE) console.log(`  [SKIP]    ${file}  (data chapter, bukan manga)`);
      continue;
    }

    // ── Parse JSON ──
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    } catch (e) {
      console.log(`  [ERROR]   ${file}: ${e.message}`);
      continue;
    }

    // ── Deteksi format & ekstrak ──
    let extracted = [];
    let formatLabel = '';

    if (isDetailFormat(raw)) {
      extracted   = [fromDetail(raw)];
      formatLabel = 'DETAIL ';
    } else if (isPagedFormat(raw)) {
      extracted   = fromPaged(raw.data.results);
      formatLabel = 'PAGED  ';
    } else if (isSearchFormat(raw)) {
      extracted   = fromSearch(raw.data);
      formatLabel = 'SEARCH ';
    } else if (isListFormat(raw)) {
      extracted   = fromList(raw, basename);
      formatLabel = 'LIST   ';
    } else if (isRootResultsFormat(raw)) {
      extracted   = fromPaged(raw.results);
      formatLabel = 'ROOTRS ';
    } else if (isTrendingFormat(raw)) {
      extracted   = fromList({ comics: raw.trending }, basename);
      formatLabel = 'TREND  ';
    } else if (isRecommendationsFormat(raw)) {
      extracted   = fromList({ comics: raw.recommendations }, basename);
      formatLabel = 'RECOMM ';
    } else if (isNumericFormat(raw)) {
      extracted   = fromNumericKeys(raw);
      formatLabel = 'NUMKEY ';
    } else {
      console.log(`  [UNKNOWN] ${file}  — format tidak dikenali, dilewati`);
      continue;
    }

    totalExtracted += extracted.length;
    console.log(`  [${formatLabel}] ${file.padEnd(55)} → ${extracted.length} item`);

    // ── Masukkan ke map dengan deduplication ──
    for (const item of extracted) {
      const { _slug, _priority, ...cleanItem } = item;
      const key = _slug || cleanItem.title;

      if (!key) {
        noSlugItems.push(cleanItem);
        continue;
      }

      const existing = bySlug.get(key);
      if (!existing || _priority > existing._priority) {
        bySlug.set(key, { ...cleanItem, _slug, _priority });
      }
    }
  }

  // ── Bangun output array ──────────────────────────────────────────────────────
  const all = [];

  for (const item of bySlug.values()) {
    // eslint-disable-next-line no-unused-vars
    const { _slug, _priority, ...clean } = item;
    all.push(clean);
  }
  for (const item of noSlugItems) {
    all.push(item);
  }

  // Buang entry yang tidak valid
  const filtered = all.filter(
    (i) =>
      i.title &&
      i.title !== 'Komiku Plus APK' &&
      !i.title.toLowerCase().includes('download apk') &&
      i.title.length > 1,
  );

  // ── Statistik ──────────────────────────────────────────────────────────────
  const byType = filtered.reduce((acc, i) => {
    acc[i.type] = (acc[i.type] || 0) + 1;
    return acc;
  }, {});

  const withDesc      = filtered.filter((i) => i.description.length > 10).length;
  const withCover     = filtered.filter((i) => i.coverImage).length;
  const withGenres    = filtered.filter((i) => i.genres.length > 0).length;
  const withChapters  = filtered.filter((i) => i.totalEpisodes).length;

  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  Total diekstrak        : ${totalExtracted}`);
  console.log(`  Setelah deduplication  : ${filtered.length} komik unik`);
  console.log(`\n  Distribusi tipe:`);
  for (const [type, count] of Object.entries(byType).sort()) {
    console.log(`    ${type.padEnd(10)}: ${count}`);
  }
  console.log(`\n  Kelengkapan data:`);
  console.log(`    Punya deskripsi  : ${withDesc}/${filtered.length}`);
  console.log(`    Punya cover      : ${withCover}/${filtered.length}`);
  console.log(`    Punya genre      : ${withGenres}/${filtered.length}`);
  console.log(`    Punya totalEpisode: ${withChapters}/${filtered.length}`);
  console.log('══════════════════════════════════════════════════════\n');

  // ── Tulis output ───────────────────────────────────────────────────────────
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputJson = {
    meta: {
      source:      'comic-converter',
      version:     '1.0',
      creator:     'Audira',
      convertedAt: new Date().toISOString(),
      totalItems:  filtered.length,
    },
    data: filtered,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputJson, null, 2), 'utf8');

  console.log(`[OK] File konversi berhasil disimpan:`);
  console.log(`     ${OUTPUT_FILE}`);
  console.log(`\n  Langkah selanjutnya:`);
  console.log(`    # Dry-run (preview tanpa simpan ke DB):`);
  console.log(`    node scripts/comic-seed.js --file data/comics.json --dry-run`);
  console.log(`\n    # Import ke MongoDB:`);
  console.log(`    node scripts/comic-seed.js --file data/comics.json --update`);
}

main();
