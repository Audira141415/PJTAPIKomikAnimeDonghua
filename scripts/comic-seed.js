'use strict';
require('module-alias/register');


/**
 * comic-seed.js — Importer data komik dari file JSON format internal.
 *
 * Script ini TIDAK bergantung pada scraping situs eksternal apapun.
 * Data sepenuhnya dari file JSON yang kamu buat sendiri.
 *
 * Format file JSON:
 * {
 *   "meta": { "source": "internal", "version": "1.0" },
 *   "data": [
 *     {
 *       "title": "Judul Komik",
 *       "alterTitle": "Alternative Title",
 *       "type": "manga",          // manga | manhwa | manhua
 *       "status": "ongoing",      // ongoing | completed | hiatus | cancelled | upcoming
 *       "genres": ["Action", "Adventure"],
 *       "description": "Sinopsis...",
 *       "author": "Nama Author",
 *       "artist": "Nama Artist",
 *       "coverImage": "https://...",
 *       "releasedOn": "2023-01-01",
 *       "totalEpisodes": null
 *     }
 *   ]
 * }
 *
 * Penggunaan:
 *   node scripts/comic-seed.js --file data/comics.json
 *   node scripts/comic-seed.js --file data/comics.json --dry-run
 *   node scripts/comic-seed.js --file data/comics.json --limit 50
 *   node scripts/comic-seed.js --file data/comics.json --skip 100 --limit 50
 *   node scripts/comic-seed.js --file data/comics.json --update
 *
 * Opsi:
 *   --file     Path ke file JSON (wajib)
 *   --dry-run  Jalankan tanpa menyimpan ke DB
 *   --limit    Batasi jumlah data yang diproses
 *   --skip     Lewati N data pertama
 *   --update   Upsert (update jika sudah ada berdasarkan slug)
 */

require('dotenv').config();

const fs       = require('fs');
const path     = require('path');
const mongoose = require('mongoose');
const slugify  = require('slugify');

const { env }  = require('@core/config/env');
const { Manga } = require('@models');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const FILE_PATH = getArg('--file');
const DRY_RUN   = hasFlag('--dry-run');
const DO_UPDATE = hasFlag('--update');
const LIMIT     = parseInt(getArg('--limit')  || '0', 10);
const SKIP_N    = parseInt(getArg('--skip')   || '0', 10);

// ── Validasi arg wajib ────────────────────────────────────────────────────────
if (!FILE_PATH) {
  console.error('[ERROR] Argumen --file wajib diisi.');
  console.error('  Contoh: node scripts/comic-seed.js --file data/comics.json');
  process.exit(1);
}

const resolvedPath = path.resolve(FILE_PATH);
if (!fs.existsSync(resolvedPath)) {
  console.error(`[ERROR] File tidak ditemukan: ${resolvedPath}`);
  process.exit(1);
}

// ── Konstanta ─────────────────────────────────────────────────────────────────
const VALID_TYPES   = ['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona'];
const VALID_STATUS  = ['ongoing', 'completed', 'hiatus', 'cancelled', 'upcoming'];

const TYPE_CATEGORY = {
  manga:   'comic',
  manhwa:  'comic',
  manhua:  'comic',
  anime:   'animation',
  donghua: 'animation',
  movie:   'animation',
  ona:     'animation',
};

const DOMAIN_PREFIXES = new Set(['www', 'm', 'amp', 'cdn', 'img', 'image', 'images', 'uploads', 'thumbnail']);

const sanitizeSourceKey = (value) => {
  const text = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return text || null;
};

const getHostname = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname ? parsed.hostname.toLowerCase() : null;
  } catch (_err) {
    return null;
  }
};

const deriveSourceKeyFromUrl = (rawUrl) => {
  const hostname = getHostname(rawUrl);
  if (!hostname) return null;

  const pieces = hostname.split('.').filter(Boolean);
  if (!pieces.length) return null;

  let labels = pieces;
  if (labels.length > 2) {
    while (labels.length > 2 && DOMAIN_PREFIXES.has(labels[0])) {
      labels = labels.slice(1);
    }
  }

  if (labels.length >= 2) {
    return sanitizeSourceKey(labels[0]);
  }
  return sanitizeSourceKey(labels[0]);
};

// ── Helper: buat slug unik ─────────────────────────────────────────────────────
const makeSlug = (title) =>
  slugify(title, { lower: true, strict: true, locale: 'id' });

// ── Normalisasi satu item JSON → dokumen Manga ─────────────────────────────────
const normalize = (item, index) => {
  const title = (item.title || '').trim();
  if (!title) {
    console.warn(`  [SKIP #${index + 1}] title kosong — dilewati`);
    return null;
  }

  const type = VALID_TYPES.includes(item.type) ? item.type : 'manga';
  const status = VALID_STATUS.includes(item.status) ? item.status : 'ongoing';
  const fallbackUrl = item.sourceUrl || item.url || item.link || item.coverImage || null;
  const sourceKey = sanitizeSourceKey(item.sourceKey || item.source || item.site)
    || deriveSourceKeyFromUrl(item.sourceUrl)
    || deriveSourceKeyFromUrl(item.coverImage)
    || deriveSourceKeyFromUrl(item.url)
    || 'internal';
  const sourceUrl = typeof fallbackUrl === 'string' ? fallbackUrl : null;

  return {
    title,
    alterTitle:    item.alterTitle    || null,
    slug:          makeSlug(title),
    description:   (item.description  || '').slice(0, 5000),
    type,
    contentCategory: TYPE_CATEGORY[type],
    status,
    genres:        Array.isArray(item.genres) ? item.genres.map((g) => String(g).trim()).filter(Boolean) : [],
    author:        item.author  || 'Unknown',
    artist:        item.artist  || 'Unknown',
    studio:        item.studio  || null,
    coverImage:    item.coverImage || null,
    releasedOn:    item.releasedOn ? new Date(item.releasedOn) : null,
    totalEpisodes: item.totalEpisodes != null ? Number(item.totalEpisodes) : null,
    network:       sourceKey,
    sourceKey,
    sourceId:      makeSlug(title),
    sourceUrl,
    externalRefs: [
      {
        sourceKey,
        sourceId: makeSlug(title),
        url: sourceUrl,
        kind: 'seed',
      },
    ],
  };
};

// ── Main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║        Audira Comic API — Internal Comic Seeder     ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  File    : ${resolvedPath}`);
  console.log(`  Mode    : ${DRY_RUN ? 'DRY RUN (tidak ada yang disimpan)' : DO_UPDATE ? 'UPSERT' : 'INSERT (skip duplikat)'}`);
  if (SKIP_N)  console.log(`  Skip    : ${SKIP_N}`);
  if (LIMIT)   console.log(`  Limit   : ${LIMIT}`);
  console.log('');

  // Baca & parse JSON
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (err) {
    console.error('[ERROR] Gagal parse JSON:', err.message);
    process.exit(1);
  }

  const items = Array.isArray(raw) ? raw : (raw.data || []);
  if (!items.length) {
    console.error('[ERROR] File JSON tidak berisi data (array kosong).');
    process.exit(1);
  }

  // Terapkan skip & limit
  const sliced = items.slice(SKIP_N, LIMIT ? SKIP_N + LIMIT : undefined);
  console.log(`  Total dalam file : ${items.length}`);
  console.log(`  Akan diproses    : ${sliced.length}`);
  console.log('');

  if (DRY_RUN) {
    console.log('[DRY RUN] Contoh 3 item pertama yang akan diimpor:');
    sliced.slice(0, 3).forEach((item, i) => {
      const norm = normalize(item, i);
      if (norm) console.log(`  [${i + 1}] ${norm.title} (${norm.type}) → slug: ${norm.slug}`);
    });
    console.log('\n[DRY RUN] Selesai. Tidak ada yang disimpan.');
    return;
  }

  // Koneksi DB
  await mongoose.connect(env.MONGO_URI);
  console.log('[DB] Terhubung ke MongoDB\n');

  let inserted = 0;
  let updated  = 0;
  let skipped  = 0;
  let errored  = 0;

  for (let i = 0; i < sliced.length; i++) {
    const doc = normalize(sliced[i], i);
    if (!doc) { skipped++; continue; }

    process.stdout.write(`  [${i + 1}/${sliced.length}] "${doc.title}" … `);

    try {
      if (DO_UPDATE) {
        const result = await Manga.findOneAndUpdate(
          { slug: doc.slug },
          { $set: doc },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
        const isNew = result.createdAt?.getTime() === result.updatedAt?.getTime();
        if (isNew) { inserted++; process.stdout.write('BARU\n'); }
        else       { updated++;  process.stdout.write('DIPERBARUI\n'); }
      } else {
        const exists = await Manga.exists({ slug: doc.slug });
        if (exists) {
          skipped++;
          process.stdout.write('SKIP (sudah ada)\n');
        } else {
          await Manga.create(doc);
          inserted++;
          process.stdout.write('OK\n');
        }
      }
    } catch (err) {
      errored++;
      process.stdout.write(`ERROR: ${err.message}\n`);
    }
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Dimasukkan   : ${inserted}`);
  console.log(`  Diperbarui   : ${updated}`);
  console.log(`  Dilewati     : ${skipped}`);
  console.log(`  Error        : ${errored}`);
  console.log('══════════════════════════════════════════════════\n');

  await mongoose.disconnect();
  console.log('[DB] Koneksi ditutup. Selesai.');
}

run().catch((err) => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
