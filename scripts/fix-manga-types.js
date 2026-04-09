'use strict';
/**
 * fix-manga-types.js
 * 
 * Update tipe konten yang salah import sebagai 'manga' padahal seharusnya
 * 'manhwa' (Korea) atau 'manhua' (China) berdasarkan judul yang diketahui.
 *
 * Cara pakai: node scripts/fix-manga-types.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { env }  = require('../src/config/env');
const Manga    = require('../src/models/Manga');

// ── Daftar koreksi berdasarkan keyword judul ──────────────────────────────────
const MANHWA_KEYWORDS = [
  // Solo Leveling family
  'solo leveling',
  // Tower of God
  'tower of god', 'bam',
  // Lookism
  'lookism',
  // God of High School
  'god of high school',
  // Noblesse
  'noblesse',
  // Omniscient Reader
  'omniscient reader',
  // Sweet Home
  'sweet home',
  // Eleceed
  'eleceed',
  // Weak Hero
  'weak hero',
  // Second Life
  'second life ranker',
  // Others
  'hardcore leveling',
  'return of the disaster',
  'max level hero',
  'SSS-class',
  'murim login',
  'infinite level up',
  'player who returned',
  'reincarnate',
  'the beginning after the end',
];

const MANHUA_KEYWORDS = [
  'martial peak',
  'battle through the heavens',
  'tales of demons',
  'apotheosis',
  'divine throne',
  'chronicles of heavenly demon',
  'strongest immortal',
  'chaotic sword',
  'swallowed star',
  'against the gods',
  'desolate era',
  'coiling dragon',
  'true martial world',
  'martial world',
  'god of slaughter',
  'emperor domination',
  'reverend insanity',
  'renegade immortal',
  'martial god',
];

function detectType(title) {
  const lower = title.toLowerCase();
  for (const kw of MANHWA_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'manhwa';
  }
  for (const kw of MANHUA_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) return 'manhua';
  }
  return null; // tidak perlu diubah
}

async function main() {
  await mongoose.connect(env.MONGO_URI);
  console.log('✅ Terhubung ke MongoDB\n');

  // Ambil semua yang tipe-nya 'manga' dari MangaDex (punya coverImage dari uploads.mangadex.org)
  const items = await Manga.find({
    type: 'manga',
    coverImage: /uploads\.mangadex\.org/,
  }).select('_id title type');

  console.log(`🔍 Ditemukan ${items.length} item manga dari MangaDex`);

  let updated = 0;
  for (const item of items) {
    const newType = detectType(item.title);
    if (newType && newType !== item.type) {
      await Manga.updateOne({ _id: item._id }, { $set: { type: newType } });
      console.log(`  ✅ "${item.title}" → ${newType}`);
      updated++;
    }
  }

  console.log(`\n📊 Ringkasan: ${updated} item diperbarui tipenya`);
  await mongoose.disconnect();
}

main().catch((err) => { console.error('❌', err.message); process.exit(1); });
