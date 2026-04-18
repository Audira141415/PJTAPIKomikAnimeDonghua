'use strict';
require('module-alias/register');


/**
 * Anichin Importer — membaca file JSON hasil scraping anichin.cafe dan mengimpor
 * ke MongoDB.
 *
 * Format JSON yang didukung:
 *   { "creator": "Audira", "data": [ { ...series } ] }
 *   ATAU array langsung: [ { ...series } ]
 *
 * Penggunaan:
 *   node scripts/anichin-import.js --file data/anichin.json
 *   node scripts/anichin-import.js --file data/anichin.json --dry-run
 *   node scripts/anichin-import.js --file data/anichin.json --limit 50
 *   node scripts/anichin-import.js --file data/anichin.json --skip 100 --limit 50
 *   node scripts/anichin-import.js --file data/anichin.json --update   # upsert alih-alih skip
 */

require('dotenv').config();

const fs       = require('fs');
const path     = require('path');
const mongoose = require('mongoose');
const slugify  = require('slugify');

const { env } = require('@core/config/env');
const { Manga } = require('@models');
const { User } = require('@models');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const FILE_PATH = getArg('--file');
const DRY_RUN   = hasFlag('--dry-run');
const DO_UPDATE = hasFlag('--update');           // upsert existing instead of skip
const LIMIT     = parseInt(getArg('--limit') || '0', 10);  // 0 = no limit
const SKIP      = parseInt(getArg('--skip')  || '0', 10);  // skip N items from start

// ── Validation ────────────────────────────────────────────────────────────────
if (!FILE_PATH) {
  console.error('❌  Harap sertakan path file JSON: --file <path>');
  console.error('    Contoh: node scripts/anichin-import.js --file data/anichin.json');
  process.exit(1);
}

const resolvedPath = path.resolve(FILE_PATH);
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌  File tidak ditemukan: ${resolvedPath}`);
  process.exit(1);
}

// ── Constants ─────────────────────────────────────────────────────────────────
const DELAY_MS = 20;   // jeda ringan antar insert agar MongoDB tidak kelebihan

/** Peta normalisasi tipe dari format anichin → enum Manga model */
const TYPE_MAP = {
  donghua : 'donghua',
  movie   : 'movie',
  ona     : 'ona',
  anime   : 'anime',
  manhwa  : 'manhwa',
  manhua  : 'manhua',
  manga   : 'manga',
};

/** Peta normalisasi status dari format anichin → enum Manga model */
const STATUS_MAP = {
  ongoing   : 'ongoing',
  completed : 'completed',
  hiatus    : 'hiatus',
  cancelled : 'cancelled',
  upcoming  : 'upcoming',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Hitung slug persis seperti pre-save hook Manga model */
function computeSlug(title) {
  return slugify(title, { lower: true, strict: true });
}

/** Normalkan tipe: "Donghua" → "donghua", "ONA" → "ona" */
function normalizeType(raw) {
  if (!raw) return 'donghua';
  return TYPE_MAP[raw.toLowerCase()] ?? 'donghua';
}

/** Normalkan status: "Ongoing" → "ongoing" */
function normalizeStatus(raw) {
  if (!raw) return 'ongoing';
  return STATUS_MAP[raw.toLowerCase()] ?? 'ongoing';
}

/**
 * Parse episode count dari string anichin.
 * "160 episodes" → 160 | "? episodes" → null | null → null
 */
function parseEpisodeCount(raw) {
  if (!raw || raw.includes('?')) return null;
  const match = String(raw).match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Ekstrak array string dari genres anichin.
 * Genres bisa berupa array of objects { name, href, anichinUrl } atau array of strings.
 */
function extractGenreNames(genres) {
  if (!genres || !Array.isArray(genres)) return [];
  return genres
    .map((g) => (typeof g === 'string' ? g : g?.name))
    .filter(Boolean);
}

/** Petakan satu item JSON anichin ke payload Manga model */
function mapToMangaPayload(item, adminId) {
  return {
    title         : item.title,
    alterTitle    : item.alternative || null,
    coverImage    : item.poster      || null,
    type          : normalizeType(item.type),
    status        : normalizeStatus(item.status),
    description   : item.description || '',
    genres        : extractGenreNames(item.genres),
    totalEpisodes : parseEpisodeCount(item.episodes),
    // Simpan rating asli jika ada; rating 0 dianggap belum ada
    rating        : (item.rating && item.rating > 0) ? item.rating : 0,
    studio        : item.studio  || null,
    sourceUrl     : item.anichinUrl || null,
    createdBy     : adminId,
  };
}

// ── Core import ───────────────────────────────────────────────────────────────
async function importSeries(seriesList, adminId, dryRun, doUpdate) {
  let imported = 0;
  let skipped  = 0;
  let updated  = 0;
  let errors   = 0;

  const total = LIMIT > 0
    ? Math.min(LIMIT, seriesList.length - SKIP)
    : seriesList.length - SKIP;

  for (let i = SKIP; i < seriesList.length; i++) {
    // Hentikan jika sudah mencapai limit
    if (LIMIT > 0 && (i - SKIP) >= LIMIT) break;

    const item     = seriesList[i];
    const progress = `[${i - SKIP + 1}/${total}]`;

    if (!item.title) {
      console.warn(`${progress} ⚠  Item #${i} tidak memiliki title, dilewati.`);
      skipped++;
      continue;
    }

    // Slug dihitung sama dengan pre-save hook agar dedup konsisten
    const slug = computeSlug(item.title);

    try {
      const existing = await Manga.findOne({
        $or: [
          { slug },
          // Tangkap juga jika sebelumnya diimpor dengan sourceUrl yang sama
          ...(item.anichinUrl ? [{ sourceUrl: item.anichinUrl }] : []),
        ],
      });

      // ── Sudah ada & tidak update ──────────────────────────────────────────
      if (existing && !doUpdate) {
        console.log(`${progress} ⏭  Skip (sudah ada): ${item.title}`);
        skipped++;
        await sleep(DELAY_MS);
        continue;
      }

      // ── Sudah ada & mode update ───────────────────────────────────────────
      if (existing && doUpdate) {
        const payload = mapToMangaPayload(item, adminId);
        if (dryRun) {
          console.log(`${progress} 🔄 DRY RUN update: ${item.title}`);
        } else {
          Object.assign(existing, payload);
          await existing.save();
          console.log(`${progress} 🔄 Diperbarui: ${item.title}`);
        }
        updated++;
        await sleep(DELAY_MS);
        continue;
      }

      // ── Belum ada → buat baru ─────────────────────────────────────────────
      const payload = mapToMangaPayload(item, adminId);

      if (dryRun) {
        const typeLabel   = payload.type;
        const statusLabel = payload.status;
        console.log(
          `${progress} 🔍 DRY RUN: "${item.title}" → slug: ${slug}, ` +
          `type: ${typeLabel}, status: ${statusLabel}, ` +
          `eps: ${payload.totalEpisodes ?? '?'}, genres: [${payload.genres.join(', ')}]`,
        );
      } else {
        await Manga.create(payload);
        console.log(`${progress} ✅ Diimport: ${item.title}`);
      }

      imported++;
      await sleep(DELAY_MS);
    } catch (err) {
      // Duplikat slug (race condition / data ganda) → lewati saja
      if (err.code === 11000) {
        console.warn(`${progress} ⚠  Duplikat slug, dilewati: ${item.title}`);
        skipped++;
      } else {
        console.error(`${progress} ❌ Error: ${item.title} — ${err.message}`);
        errors++;
      }
    }
  }

  return { imported, updated, skipped, errors };
}

// ── Entry Point ───────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Anichin Importer  —  JSON → MongoDB            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (DRY_RUN)   console.log('⚠  DRY RUN mode — tidak ada data yang disimpan\n');
  if (DO_UPDATE) console.log('🔄 UPDATE mode — entri yang sudah ada akan diperbarui\n');

  // ── Baca & validasi JSON ──────────────────────────────────────────────────
  let root;
  try {
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    root = JSON.parse(raw);
  } catch (err) {
    console.error(`❌  Gagal membaca/parse JSON: ${err.message}`);
    process.exit(1);
  }

  // Dukung dua format: { data: [...] }  ATAU  [...]
  const seriesList = Array.isArray(root) ? root : (root.data ?? []);

  if (!seriesList.length) {
    console.error('❌  Tidak ada data series di dalam file JSON.');
    process.exit(1);
  }

  const effectiveTotal = LIMIT > 0
    ? Math.min(LIMIT, seriesList.length - SKIP)
    : seriesList.length - SKIP;

  console.log(`📂  File   : ${resolvedPath}`);
  console.log(`📦  Total  : ${seriesList.length} series (akan diproses: ${effectiveTotal})`);
  if (SKIP  > 0) console.log(`⏩  Skip   : ${SKIP} item pertama`);
  if (LIMIT > 0) console.log(`🔢  Limit  : ${LIMIT}`);
  console.log();

  // ── Koneksi MongoDB ───────────────────────────────────────────────────────
  await mongoose.connect(env.MONGO_URI);
  console.log('✅  Terhubung ke MongoDB\n');

  // ── Admin user ────────────────────────────────────────────────────────────
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    if (DRY_RUN) {
      // Dry-run: gunakan ObjectId dummy agar validasi createdBy tidak gagal
      admin = { _id: new mongoose.Types.ObjectId() };
      console.log('⚠  Admin tidak ditemukan — memakai dummy ObjectId (dry-run)\n');
    } else {
      admin = await User.create({
        username : 'admin',
        email    : 'admin@anichin.local',
        password : 'admin123',
        role     : 'admin',
      });
      console.log('✅  Admin user dibuat\n');
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { imported, updated, skipped, errors } =
    await importSeries(seriesList, admin._id, DRY_RUN, DO_UPDATE);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊  Ringkasan:');
  console.log(`    ✅  Diimport   : ${imported}`);
  if (DO_UPDATE)
    console.log(`    🔄  Diperbarui : ${updated}`);
  console.log(`    ⏭  Dilewati   : ${skipped}`);
  console.log(`    ❌  Error      : ${errors}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('💥  Fatal error:', err.message);
  process.exit(1);
});
