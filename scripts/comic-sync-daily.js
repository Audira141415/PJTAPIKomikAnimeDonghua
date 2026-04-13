'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const slugify = require('slugify');

const { env } = require('../src/config/env');
const Manga = require('../src/models/Manga');
const User = require('../src/models/User');
const aggregator = require('../src/modules/comic/scrapers/aggregator/aggregator.service');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag) => {
  const index = args.indexOf(flag);
  return index !== -1 ? args[index + 1] : null;
};

const SOURCES = getArg('--sources') || 'all';
const PAGE = Math.max(1, parseInt(getArg('--page') || '1', 10));
const DRY_RUN = hasFlag('--dry-run');
const DO_UPDATE = hasFlag('--update') || true;

const COMIC_TYPES = new Set(['manga', 'manhwa', 'manhua']);

function makeSlug(sourceKey, sourceId, title) {
  const base = sourceId || title || 'comic';
  return slugify(`${sourceKey}-${base}`, { lower: true, strict: true });
}

function normalizeComicType(value) {
  const text = String(value || '').toLowerCase().trim();
  if (COMIC_TYPES.has(text)) return text;
  if (text.includes('manhwa')) return 'manhwa';
  if (text.includes('manhua')) return 'manhua';
  return 'manga';
}

function buildComicDoc(card) {
  const sourceKey = String(card.source || 'unknown').trim();
  const sourceId = card.slug || card.link || card.title || null;
  const title = String(card.title || '').trim();

  if (!sourceKey || !title) {
    return null;
  }

  const slug = makeSlug(sourceKey, sourceId, title);

  return {
    title,
    slug,
    alterTitle: null,
    description: '',
    type: normalizeComicType(card.type),
    contentCategory: 'comic',
    genres: [],
    author: 'Unknown',
    artist: 'Unknown',
    studio: null,
    sub: 'Sub',
    creator: env.SITE_CREATOR || 'Audira',
    released: null,
    duration: null,
    network: sourceKey,
    country: null,
    releasedOn: null,
    coverImage: card.cover || null,
    status: 'ongoing',
    rating: typeof card.rating === 'number' ? card.rating : 0,
    ratingCount: 0,
    views: 0,
    sourceUrl: card.link || null,
    sourceKey,
    sourceId,
    externalRefs: [
      {
        sourceKey,
        sourceId,
        url: card.link || null,
        kind: 'series',
      },
    ],
    synopsis: null,
    lastSyncedAt: new Date(),
  };
}

async function ensureAdminUser() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Admin user tidak ditemukan. Buat admin lebih dulu sebelum menjalankan comic-sync-daily.');
  }
  return admin;
}

async function upsertComicDocs(cards, adminId) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let conflicted = 0;

  for (const card of cards) {
    const doc = buildComicDoc(card);
    if (!doc) {
      skipped += 1;
      continue;
    }

    const identityQuery = doc.sourceKey && doc.sourceId
      ? { sourceKey: doc.sourceKey, sourceId: doc.sourceId }
      : { slug: doc.slug };

    const existing = await Manga.findOne(identityQuery);
    if (existing && existing.contentCategory !== 'comic') {
      conflicted += 1;
      continue;
    }

    if (existing && !DO_UPDATE) {
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      continue;
    }

    if (existing) {
      Object.assign(existing, doc, { createdBy: existing.createdBy || adminId });
      await existing.save();
      updated += 1;
      continue;
    }

    await Manga.create({ ...doc, createdBy: adminId });
    inserted += 1;
  }

  return { inserted, updated, skipped, conflicted };
}

async function run() {
  await mongoose.connect(env.MONGO_URI);
  const admin = await ensureAdminUser();

  const result = await aggregator.latest(SOURCES, PAGE);
  const cards = Array.isArray(result?.komikList) ? result.komikList : [];
  const perSource = Array.isArray(result?.sources) ? result.sources : [];

  const summary = await upsertComicDocs(cards, admin._id);

  console.log('----------------------------------------');
  console.log('Comic sync from existing source registry');
  console.log(`Sources   : ${perSource.length}`);
  console.log(`Fetched   : ${cards.length}`);
  console.log(`Inserted  : ${summary.inserted}`);
  console.log(`Updated   : ${summary.updated}`);
  console.log(`Skipped   : ${summary.skipped}`);
  console.log(`Conflicts : ${summary.conflicted}`);
  console.log(`Page      : ${PAGE}`);
  console.log(`Sources   : ${SOURCES}`);

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