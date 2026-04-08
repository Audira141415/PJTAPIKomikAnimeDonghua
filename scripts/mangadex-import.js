/**
 * MangaDex Importer — Bahasa Indonesia
 * =====================================
 * Mengambil manga dari MangaDex API yang tersedia dalam bahasa Indonesia
 * dan menyimpannya langsung ke MongoDB.
 *
 * Cara pakai:
 *   node scripts/mangadex-import.js                     → import 10 manga populer
 *   node scripts/mangadex-import.js --limit 20          → import 20 manga
 *   node scripts/mangadex-import.js --title "Naruto"    → cari judul tertentu
 *   node scripts/mangadex-import.js --id abc123         → satu manga by MangaDex ID
 *   node scripts/mangadex-import.js --chapters          → juga import daftar chapter
 */

'use strict';

require('dotenv').config();
const axios    = require('axios');
const mongoose = require('mongoose');
const slugify  = require('slugify');
const { env }  = require('../src/config/env');

// ── Models ────────────────────────────────────────────────────────────────────
const User    = require('../src/models/User');
const Manga   = require('../src/models/Manga');
const Chapter = require('../src/models/Chapter');

// ── Config ────────────────────────────────────────────────────────────────────
const MANGADEX_API   = 'https://api.mangadex.org';
const COVERS_CDN     = 'https://uploads.mangadex.org/covers';
const DELAY_MS       = 400; // jeda antar request agar tidak kena rate-limit MangaDex

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const LIMIT           = parseInt(getArg('--limit') || '10', 10);
const SEARCH_TITLE    = getArg('--title');
const SINGLE_ID       = getArg('--id');
const IMPORT_CHAPTERS = args.includes('--chapters');
const IMPORT_ALL      = args.includes('--all');   // ambil semua halaman
const BATCH_SIZE      = 100;                       // max per request MangaDex

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const http = axios.create({
  baseURL: MANGADEX_API,
  timeout: 15000,
  headers: { 'User-Agent': 'ComicStreamImporter/1.0' },
});

/** Retry wrapper — coba ulang sampai 3x jika rate-limit (429) atau network error */
async function get(url, params = {}, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await http.get(url, { params });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      // MangaDex membatasi offset maks 10000 — stop gracefully
      if (status === 400) {
        const msg = JSON.stringify(err.response?.data || '');
        if (msg.includes('offset') || msg.includes('limit')) {
          console.warn('\n  ⚠️  Batas offset MangaDex tercapai (maks 10.000). Import dihentikan.');
          return null;
        }
      }
      if (status === 429 || status === 503) {
        const wait = (i + 1) * 3000;
        console.warn(`\n  ⏳ Rate limit. Tunggu ${wait / 1000}s...`);
        await sleep(wait);
      } else if (i === retries - 1) {
        throw err;
      } else {
        await sleep(1000);
      }
    }
  }
}

// ── Map MangaDex type → tipe kita ────────────────────────────────────────────
function mapType(mangadexType) {
  // MangaDex: manga, manhwa, manhua, one_shot, doujinshi, novel, oel
  const map = { manga: 'manga', manhwa: 'manhwa', manhua: 'manhua' };
  return map[mangadexType] || 'manga';
}

// ── Ambil URL cover ───────────────────────────────────────────────────────────
function getCoverUrl(mangaId, relationships) {
  const cover = relationships.find((r) => r.type === 'cover_art');
  if (!cover?.attributes?.fileName) return null;
  return `${COVERS_CDN}/${mangaId}/${cover.attributes.fileName}.256.jpg`;
}

// ── Ambil nama author/artist ──────────────────────────────────────────────────
function getPerson(relationships, type) {
  const found = relationships.find((r) => r.type === type);
  return found?.attributes?.name || 'Unknown';
}

// ── Extract genre/tag dari MangaDex tags ─────────────────────────────────────
const GENRE_MAP = {
  'Action':       'Action',
  'Adventure':    'Adventure',
  'Comedy':       'Comedy',
  'Drama':        'Drama',
  'Fantasy':      'Fantasy',
  'Horror':       'Horror',
  'Mystery':      'Mystery',
  'Romance':      'Romance',
  'Sci-Fi':       'Sci-Fi',
  'Slice of Life':'Slice of Life',
  'Sports':       'Sports',
  'Supernatural': 'Supernatural',
  'Thriller':     'Thriller',
  'Isekai':       'Isekai',
  'Martial Arts': 'Martial Arts',
};

function extractGenres(tags) {
  const genres = [];
  for (const tag of tags) {
    const name = tag.attributes?.name?.en;
    if (name && GENRE_MAP[name]) genres.push(GENRE_MAP[name]);
  }
  return genres.length ? genres : ['Action'];
}

// ── Map status ────────────────────────────────────────────────────────────────
function mapStatus(st) {
  const map = { ongoing: 'ongoing', completed: 'completed', hiatus: 'hiatus', cancelled: 'cancelled' };
  return map[st] || 'ongoing';
}

// ── Ambil deskripsi preferensi bahasa Indonesia → English → apapun ───────────
function getDescription(attributes) {
  const desc = attributes.description;
  return desc?.id || desc?.en || Object.values(desc || {})[0] || '';
}

// ── Ambil judul terjemahan Indonesia jika ada, fallback ke judul asli ────────
function getTitle(attributes) {
  // altTitles adalah array of { [lang]: "title" }
  if (attributes.altTitles) {
    for (const entry of attributes.altTitles) {
      if (entry.id) return entry.id; // judul Bahasa Indonesia
    }
  }
  return attributes.title?.en || attributes.title?.ja || Object.values(attributes.title || {})[0] || 'Unknown';
}

// ── Import satu manga ─────────────────────────────────────────────────────────
async function importManga(mangaData, adminId) {
  const { id: mdId, attributes, relationships } = mangaData;

  const title       = getTitle(attributes);
  const description = getDescription(attributes);
  const type        = mapType(attributes.originalLanguage);
  const status      = mapStatus(attributes.status);
  const genres      = extractGenres(attributes.tags || []);
  const coverImage  = getCoverUrl(mdId, relationships || []);
  const author      = getPerson(relationships || [], 'author');
  const artist      = getPerson(relationships || [], 'artist');

  // Cek sudah ada di DB? (berdasarkan slug)
  const slug = slugify(title, { lower: true, strict: true });
  const existing = await Manga.findOne({ slug });
  if (existing) {
    console.log(`  ⏭  Skip "${title}" — sudah ada di database`);
    return existing;
  }

  const manga = await Manga.create({
    title,
    description,
    type,
    status,
    genres,
    coverImage,
    author,
    artist,
    slug,
    createdBy: adminId,
    // Simpan MangaDex ID di field views sementara... tidak, simpan sebagai originalId:
    // (Kita tidak punya field custom, tapi ini tidak masalah untuk import)
  });

  console.log(`  ✅ Import: "${title}" [${type}] — ${genres.join(', ')}`);
  return manga;
}

// ── Import chapters untuk satu manga (metadata saja, tanpa URL gambar) ────────
async function importChapters(mdMangaId, mongoMangaId) {
  process.stdout.write(`     📖 Mengambil chapter...`);

  let offset = 0;
  let total  = Infinity;
  let count  = 0;

  while (offset < total) {
    await sleep(DELAY_MS);
    const data = await get('/chapter', {
      manga:                    mdMangaId,
      'translatedLanguage[]':   'id',
      'order[chapter]':         'asc',
      limit:                    100,
      offset,
    });

    if (!data || !data?.data?.length) break;
    total = data.total;

    for (const ch of data.data) {
      const attr          = ch.attributes;
      const chapterNumber = parseFloat(attr.chapter) || (count + 1);
      const chapterTitle  = attr.title || `Chapter ${chapterNumber}`;

      // Simpan metadata chapter + mdChapterId (URL gambar diambil on-demand saat baca)
      const exists = await Chapter.findOne({ manga: mongoMangaId, chapterNumber });
      if (!exists) {
        await Chapter.create({
          manga:         mongoMangaId,
          chapterNumber,
          title:         chapterTitle,
          images:        [],        // kosong dulu, diisi saat user baca
          mdChapterId:   ch.id,     // simpan ID MangaDex untuk fetch gambar nanti
        });
        count++;
      }
    }

    process.stdout.write(`\r     📄 Chapter diimport: ${count} / ${total}   `);
    offset += data.data.length;
    if (offset >= total) break;
  }

  console.log(`\n     ✅ ${count} chapter baru (gambar diambil saat baca)`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       MangaDex Importer — Bahasa Indonesia   ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Connect MongoDB
  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Terhubung ke MongoDB\n');

  // Ambil / buat admin user
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      username: 'admin',
      email:    'admin@comic.com',
      password: 'admin123',
      role:     'admin',
    });
    console.log('✅ Admin user dibuat\n');
  }

  let mangaList = [];

  // ── Mode: satu manga by ID ──────────────────────────────────────────────
  if (SINGLE_ID) {
    console.log(`🔍 Mengambil manga ID: ${SINGLE_ID}`);
    const data = await get(`/manga/${SINGLE_ID}`, {
      'includes[]': ['cover_art', 'author', 'artist'],
    });
    if (data?.data) mangaList = [data.data];

  // ── Mode: cari by judul ──────────────────────────────────────────────────
  } else if (SEARCH_TITLE) {
    console.log(`🔍 Mencari: "${SEARCH_TITLE}" dengan bahasa Indonesia tersedia...`);
    const data = await get('/manga', {
      title:                               SEARCH_TITLE,
      'availableTranslatedLanguage[]':     'id',
      limit:                               LIMIT,
      'includes[]':                        ['cover_art', 'author', 'artist'],
      'order[followedCount]':              'desc',
      'contentRating[]':                   ['safe', 'suggestive'],
    });
    mangaList = data?.data || [];

  // ── Mode: ambil SEMUA (paginasi) ─────────────────────────────────────────
  } else if (IMPORT_ALL) {
    console.log('🔍 Mengambil SEMUA manga dengan bahasa Indonesia tersedia...');
    console.log('   (ini akan memakan waktu beberapa menit)\n');

    let offset    = 0;
    let totalAll  = Infinity;
    let pageNum   = 1;

    while (offset < totalAll) {
      await sleep(DELAY_MS);
      const data = await get('/manga', {
        'availableTranslatedLanguage[]': 'id',
        limit:                           BATCH_SIZE,
        offset,
        'includes[]':                    ['cover_art', 'author', 'artist'],
        'order[followedCount]':          'desc',
        'contentRating[]':               ['safe', 'suggestive'],
      });

      // null = batas offset MangaDex tercapai, berhenti
      if (!data || !data?.data?.length) break;
      totalAll = data.total;
      mangaList.push(...data.data);

      const fetched = Math.min(offset + BATCH_SIZE, totalAll);
      process.stdout.write(`\r   📥 Halaman ${pageNum} — ${fetched} / ${totalAll} manga diambil`);

      offset  += BATCH_SIZE;
      pageNum += 1;

      if (offset >= totalAll) break;
    }
    console.log(`\n\n📦 Total ditemukan: ${mangaList.length} manga. Mulai import...\n`);

  // ── Mode: populer dengan bahasa Indonesia (default) ──────────────────────
  } else {
    console.log(`🔍 Mengambil ${LIMIT} manga populer dengan bahasa Indonesia tersedia...`);
    const data = await get('/manga', {
      'availableTranslatedLanguage[]':  'id',
      limit:                            LIMIT,
      'includes[]':                     ['cover_art', 'author', 'artist'],
      'order[followedCount]':           'desc',
      'contentRating[]':                ['safe', 'suggestive'],
    });
    mangaList = data?.data || [];
  }

  if (!mangaList.length) {
    console.log('❌ Tidak ada manga ditemukan.');
    process.exit(0);
  }

  if (!IMPORT_ALL) {
    console.log(`📦 Ditemukan ${mangaList.length} manga. Mulai import...\n`);
  }

  let success = 0;
  let skip    = 0;

  for (let i = 0; i < mangaList.length; i++) {
    const item  = mangaList[i];
    const progress = `[${i + 1}/${mangaList.length}]`;
    process.stdout.write(`\r${progress} `);

    const manga = await importManga(item, admin._id);
    if (!manga) { skip++; continue; }

    if (IMPORT_CHAPTERS) {
      await importChapters(item.id, manga._id);
    }

    success++;
    await sleep(DELAY_MS);
  }

  console.log('\n══════════════════════════════════════════════');
  console.log(`✅ Selesai! ${success} manga diimport, ${skip} dilewati (sudah ada)`);
  if (!IMPORT_CHAPTERS) {
    console.log('\nTip: Tambahkan --chapters untuk juga import metadata chapter:');
    console.log('     node scripts/mangadex-import.js --all --chapters');
    console.log('     (Gambar per chapter diambil otomatis saat user membaca via GET /chapters/:id/images)\n');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Error:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
