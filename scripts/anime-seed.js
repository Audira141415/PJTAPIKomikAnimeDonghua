'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const slugify = require('slugify');

const { env } = require('../src/config/env');
const Manga = require('../src/models/Manga');
const User = require('../src/models/User');

const SAMPLE_ANIME = [
  {
    title: 'Naruto Shippuden',
    description: 'Ninja action story following Naruto in his teenage years.',
    genres: ['Action', 'Adventure'],
    studio: 'Studio Pierrot',
    status: 'completed',
    totalEpisodes: 500,
    coverImage: 'https://cdn.myanimelist.net/images/anime/1565/111305.jpg',
  },
  {
    title: 'One Piece',
    description: 'Pirate adventure across the Grand Line.',
    genres: ['Action', 'Adventure', 'Comedy'],
    studio: 'Toei Animation',
    status: 'ongoing',
    totalEpisodes: 1100,
    coverImage: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg',
  },
  {
    title: 'Jujutsu Kaisen',
    description: 'A student enters the world of cursed spirits and sorcerers.',
    genres: ['Action', 'Supernatural'],
    studio: 'MAPPA',
    status: 'ongoing',
    totalEpisodes: 47,
    coverImage: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
  },
  {
    title: 'Sousou no Frieren',
    description: 'An elven mage reflects on life and friendship after the hero journey ends.',
    genres: ['Fantasy', 'Adventure', 'Drama'],
    studio: 'Madhouse',
    status: 'ongoing',
    totalEpisodes: 28,
    coverImage: 'https://cdn.myanimelist.net/images/anime/1015/138006.jpg',
  },
  {
    title: 'Kimetsu no Yaiba',
    description: 'Tanjiro fights demons while searching for a cure for his sister.',
    genres: ['Action', 'Fantasy'],
    studio: 'ufotable',
    status: 'ongoing',
    totalEpisodes: 63,
    coverImage: 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
  },
];

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const DRY_RUN = hasFlag('--dry-run');
const DO_UPDATE = hasFlag('--update');
const LIMIT = parseInt(getArg('--limit') || '0', 10);

async function ensureAdminUser() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Admin user tidak ditemukan. Buat admin lebih dulu sebelum menjalankan anime-seed.');
  }
  return admin;
}

function makePayload(item, adminId) {
  return {
    title: item.title,
    slug: slugify(item.title, { lower: true, strict: true }),
    description: item.description || '',
    type: 'anime',
    contentCategory: 'animation',
    genres: item.genres || [],
    studio: item.studio || null,
    status: item.status || 'ongoing',
    totalEpisodes: item.totalEpisodes ?? null,
    coverImage: item.coverImage || null,
    creator: env.SITE_CREATOR || 'Audira',
    createdBy: adminId,
  };
}

async function run() {
  if (!Number.isInteger(LIMIT) || LIMIT < 0) {
    throw new Error('Argumen --limit harus bilangan bulat >= 0.');
  }

  await mongoose.connect(env.MONGO_URI);

  const admin = await ensureAdminUser();
  const dataset = LIMIT > 0 ? SAMPLE_ANIME.slice(0, LIMIT) : SAMPLE_ANIME;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of dataset) {
    const payload = makePayload(item, admin._id);
    const existing = await Manga.findOne({ slug: payload.slug });

    if (existing && !DO_UPDATE) {
      skipped += 1;
      console.log(`SKIP    ${payload.title}`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`${existing ? 'UPDATE?' : 'INSERT?'} ${payload.title}`);
      continue;
    }

    if (existing) {
      Object.assign(existing, payload);
      await existing.save();
      updated += 1;
      console.log(`UPDATE  ${payload.title}`);
    } else {
      await Manga.create(payload);
      inserted += 1;
      console.log(`INSERT  ${payload.title}`);
    }
  }

  console.log('----------------------------------------');
  console.log(`Inserted: ${inserted}`);
  console.log(`Updated : ${updated}`);
  console.log(`Skipped : ${skipped}`);

  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error('FATAL:', err.message);
  try {
    await mongoose.disconnect();
  } catch (_err) {
    // noop
  }
  process.exit(1);
});
