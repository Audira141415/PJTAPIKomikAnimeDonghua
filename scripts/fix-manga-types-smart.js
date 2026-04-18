'use strict';
require('module-alias/register');
/**
 * fix-manga-types-smart.js
 * ========================
 * Perbaiki items yang salah tipe (manhwa/manhua tersimpan sebagai 'manga')
 * dengan query MangaDex API berdasarkan judul untuk mendapatkan originalLanguage.
 *
 * Cara pakai:
 *   node scripts/fix-manga-types-smart.js           → dry-run, tidak simpan
 *   node scripts/fix-manga-types-smart.js --apply   → terapkan perubahan
 *   node scripts/fix-manga-types-smart.js --apply --verbose → detail per item
 */

'use strict';

require('dotenv').config();
const axios    = require('axios');
const mongoose = require('mongoose');
const { env }  = require('@core/config/env');
const { Manga } = require('@models');

const MANGADEX_API = 'https://api.mangadex.org';
const APPLY        = process.argv.includes('--apply');
const VERBOSE      = process.argv.includes('--verbose');
const DELAY_MS     = 500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const http = axios.create({
  baseURL: MANGADEX_API,
  timeout: 10000,
  headers: { 'User-Agent': 'ComicStreamTypeFixer/1.0' },
});

// Map language code → type (sama dengan mangadex-import.js)
function mapType(originalLanguage) {
  const langMap = {
    ja: 'manga', 'ja-ro': 'manga',
    ko: 'manhwa', 'ko-ro': 'manhwa',
    zh: 'manhua', 'zh-hk': 'manhua', 'zh-ro': 'manhua',
  };
  return langMap[originalLanguage] || 'manga';
}

// Cari originalLanguage di MangaDex berdasarkan judul
async function lookupType(title) {
  try {
    await sleep(DELAY_MS);
    const res = await http.get('/manga', {
      params: {
        title,
        limit: 3,
        'order[followedCount]': 'desc',
        'contentRating[]': ['safe', 'suggestive', 'erotica'],
      },
    });

    const results = res.data?.data || [];
    if (!results.length) return null;

    // Cari match terbaik: bandingkan judul
    const titleLower = title.toLowerCase();
    let best = null;
    let bestScore = 0;

    for (const item of results) {
      const a = item.attributes;
      // Kumpulkan semua judul (title + altTitles)
      const allTitles = [
        ...Object.values(a.title || {}),
        ...(a.altTitles || []).flatMap(t => Object.values(t)),
      ].map(t => t.toLowerCase());

      // Hitung skor: exact match > partial match
      let score = 0;
      if (allTitles.includes(titleLower)) score = 100;
      else if (allTitles.some(t => t.includes(titleLower) || titleLower.includes(t))) score = 50;
      else score = 10; // fallback: ambil hasil pertama dengan skor rendah

      if (score > bestScore) {
        bestScore = score;
        best = { origLang: a.originalLanguage, allTitles, score };
      }
    }

    return best;
  } catch (err) {
    if (VERBOSE) console.error(`   ⚠️  API error untuk "${title}": ${err.message}`);
    return null;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         Smart Manga Type Fixer                   ║');
  console.log(`║  Mode: ${APPLY ? 'APPLY (simpan perubahan)          ' : 'DRY-RUN (tidak simpan)          '}║`);
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!APPLY) {
    console.log('💡 Jalankan dengan --apply untuk terapkan perubahan.\n');
  }

  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Terhubung ke MongoDB\n');

  // Ambil semua item bertipe 'manga' (yang mungkin seharusnya manhwa/manhua)
  // Skip yang dari anichin (coverImage dari anichin.cafe) — itu memang manga/donghua
  const mangas = await Manga.find({
    type: 'manga',
    coverImage: { $not: /anichin\.cafe/ }, // skip anichin imports
  }).select('_id title slug coverImage').lean();

  console.log(`📋 Ditemukan ${mangas.length} item tipe 'manga' (non-anichin) untuk diperiksa\n`);

  const fixes = [];
  const skips = [];
  const errors = [];

  for (let i = 0; i < mangas.length; i++) {
    const item = mangas[i];
    process.stdout.write(`\r[${i + 1}/${mangas.length}] "${item.title.substring(0, 40)}...    `);

    const result = await lookupType(item.title);

    if (!result) {
      errors.push(item.title);
      if (VERBOSE) console.log(`\n  ❌ Tidak bisa lookup: "${item.title}"`);
      continue;
    }

    const newType = mapType(result.origLang);

    if (newType !== 'manga') {
      fixes.push({
        _id: item._id,
        title: item.title,
        origLang: result.origLang,
        newType,
        score: result.score,
      });
      if (VERBOSE) {
        console.log(`\n  🔄 "${item.title}"`);
        console.log(`     origLang: ${result.origLang} → type: ${newType} (score: ${result.score})`);
      }
    } else {
      skips.push(item.title);
    }
  }

  console.log('\n\n══════════════════════════════════════════════════');
  console.log(`📊 Hasil analisis:`);
  console.log(`   ✅ Perlu fix: ${fixes.length}`);
  console.log(`   ⏭  Tetap manga: ${skips.length}`);
  console.log(`   ❌ Tidak bisa lookup: ${errors.length}`);

  if (fixes.length) {
    console.log('\n📋 Items yang akan diubah tipenya:');
    const byType = { manhwa: [], manhua: [] };
    for (const f of fixes) {
      (byType[f.newType] || []).push(f.title);
      if (!APPLY) console.log(`   • [${f.origLang}→${f.newType}] ${f.title}`);
    }
    console.log(`\n   Manhwa: ${byType.manhwa.length}`);
    console.log(`   Manhua: ${byType.manhua.length}`);
  }

  if (APPLY && fixes.length) {
    console.log('\n💾 Menyimpan perubahan...');
    let updated = 0;
    for (const f of fixes) {
      await Manga.updateOne({ _id: f._id }, { type: f.newType });
      updated++;
      if (VERBOSE) console.log(`  ✅ Updated: "${f.title}" → ${f.newType}`);
    }
    console.log(`\n✅ Selesai! ${updated} item diperbarui.`);
  } else if (!APPLY && fixes.length) {
    console.log('\n💡 Jalankan dengan --apply untuk terapkan perubahan:');
    console.log('   node scripts/fix-manga-types-smart.js --apply');
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('\n❌ Fatal Error:', err);
  process.exit(1);
});
