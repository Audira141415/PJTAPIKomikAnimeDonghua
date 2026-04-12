'use strict';

require('dotenv').config();

const axios = require('axios');
const mongoose = require('mongoose');
const slugify = require('slugify');

const { env } = require('../src/config/env');
const Manga = require('../src/models/Manga');
const User = require('../src/models/User');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const BASE_URL = getArg('--base-url') || `http://localhost:${env.PORT || 3000}/api/v1`;
const LIMIT_PER_SOURCE = parseInt(getArg('--limit') || '20', 10);
const DO_UPDATE = hasFlag('--update');
const DRY_RUN = hasFlag('--dry-run');
const ONLY_SOURCE = getArg('--source');

const SOURCE_ENDPOINTS = [
  { key: 'anime', path: '/anime/home' },
  { key: 'samehadaku', path: '/samehadaku/home' },
  { key: 'animasu', path: '/animasu/home' },
  { key: 'kusonime', path: '/kusonime/home' },
  { key: 'anoboy', path: '/anoboy/home' },
  { key: 'animesail', path: '/animesail/home' },
  { key: 'oploverz', path: '/oploverz/ongoing' },
  { key: 'stream', path: '/stream/latest' },
  { key: 'animekuindo', path: '/animekuindo/latest' },
  { key: 'nimegami', path: '/nimegami/home' },
  { key: 'alqanime', path: '/alqanime/ongoing' },
  { key: 'donghub', path: '/donghub/latest' },
  { key: 'winbu', path: '/winbu/latest' },
  { key: 'kura', path: '/kura/home' },
  { key: 'dramabox', path: '/dramabox/latest' },
  { key: 'drachin', path: '/drachin/latest' },
];

const client = axios.create({
  timeout: 20000,
  headers: { 'User-Agent': 'AudiraAnimeSync/1.0' },
});

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function pushIfContentItem(bucket, node) {
  if (!isObject(node)) return;
  const hasTitle = typeof node.title === 'string' && node.title.trim() !== '';
  const hasPoster = !!(node.poster || node.coverImage || node.image || node.thumb);
  const hasUrl = Object.keys(node).some((k) => k.toLowerCase().includes('url'));
  if (hasTitle || hasPoster || hasUrl) {
    bucket.push(node);
  }
}

function collectItemsDeep(input, bucket = []) {
  if (Array.isArray(input)) {
    input.forEach((node) => collectItemsDeep(node, bucket));
    return bucket;
  }

  if (!isObject(input)) {
    return bucket;
  }

  pushIfContentItem(bucket, input);

  Object.values(input).forEach((value) => {
    if (Array.isArray(value) || isObject(value)) {
      collectItemsDeep(value, bucket);
    }
  });

  return bucket;
}

function pickFirst(...values) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function detectStatus(raw) {
  const text = String(raw || '').toLowerCase();
  if (text.includes('complete') || text.includes('completed') || text.includes('tamat')) {
    return 'completed';
  }
  if (text.includes('hiatus')) return 'hiatus';
  if (text.includes('cancel')) return 'cancelled';
  return 'ongoing';
}

function parseEpisodeCount(raw) {
  if (raw == null) return null;
  const text = String(raw);
  const match = text.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function normalizeGenres(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      if (isObject(entry) && typeof entry.name === 'string') return entry.name.trim();
      return null;
    })
    .filter(Boolean);
}

function buildSourceUrl(item) {
  const keys = Object.keys(item);
  const urlKey = keys.find((k) => k.toLowerCase().endsWith('url'));
  if (urlKey && typeof item[urlKey] === 'string') {
    return item[urlKey];
  }
  return pickFirst(item.url, item.href, item.link);
}

function mapToAnimeDoc(item, sourceKey, adminId) {
  const title = pickFirst(item.title, item.name, item.animeTitle);
  if (!title) return null;

  const slug = slugify(title, { lower: true, strict: true });
  if (!slug) return null;

  const statusRaw = pickFirst(item.status, item.episode, item.episodes, item.releasedOn);
  const genres = normalizeGenres(item.genres);

  return {
    title,
    slug,
    type: 'anime',
    contentCategory: 'animation',
    status: detectStatus(statusRaw),
    description: pickFirst(item.description, item.synopsis, item.sinopsis) || '',
    genres,
    studio: pickFirst(item.studio, item.production),
    coverImage: pickFirst(item.poster, item.coverImage, item.image, item.thumb),
    totalEpisodes: parseEpisodeCount(item.episodes || item.episode),
    sourceUrl: buildSourceUrl(item),
    creator: env.SITE_CREATOR || 'Audira',
    createdBy: adminId,
    author: 'Unknown',
    artist: 'Unknown',
    sub: pickFirst(item.sub, item.subtitle) || 'Sub',
    network: sourceKey,
    country: pickFirst(item.country, item.origin),
  };
}

function dedupeBySlug(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item || !item.slug) return;
    if (!map.has(item.slug)) {
      map.set(item.slug, item);
    }
  });
  return Array.from(map.values());
}

async function ensureAdminUser() {
  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Admin user tidak ditemukan. Buat admin lebih dulu sebelum menjalankan anime-sync-proxy.');
  }
  return admin;
}

async function fetchSourceItems(source) {
  const url = `${BASE_URL}${source.path}`;
  const response = await client.get(url);
  const root = response.data;

  const candidates = collectItemsDeep(root);
  const filtered = candidates.filter((item) => isObject(item) && (item.title || item.name));
  return filtered.slice(0, LIMIT_PER_SOURCE);
}

async function upsertAnimeDocs(docs) {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let conflicted = 0;

  for (const doc of docs) {
    const existing = await Manga.findOne({ slug: doc.slug });

    // Slug is globally unique in Manga model.
    // If same slug already belongs to non-anime content, skip to avoid collisions.
    if (existing && existing.type !== 'anime') {
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
      Object.assign(existing, doc);
      await existing.save();
      updated += 1;
    } else {
      await Manga.create(doc);
      inserted += 1;
    }
  }

  return { inserted, updated, skipped, conflicted };
}

async function run() {
  if (!Number.isInteger(LIMIT_PER_SOURCE) || LIMIT_PER_SOURCE <= 0) {
    throw new Error('Argumen --limit harus bilangan bulat > 0.');
  }

  await mongoose.connect(env.MONGO_URI);
  const admin = await ensureAdminUser();

  const activeSources = ONLY_SOURCE
    ? SOURCE_ENDPOINTS.filter((s) => s.key === ONLY_SOURCE)
    : SOURCE_ENDPOINTS;

  if (!activeSources.length) {
    throw new Error(`Source tidak ditemukan: ${ONLY_SOURCE}`);
  }

  let totalFetched = 0;
  const mergedDocs = [];

  for (const source of activeSources) {
    try {
      const rawItems = await fetchSourceItems(source);
      totalFetched += rawItems.length;

      const docs = rawItems
        .map((item) => mapToAnimeDoc(item, source.key, admin._id))
        .filter(Boolean);

      mergedDocs.push(...docs);
      console.log(`SOURCE ${source.key.padEnd(12)} fetched=${rawItems.length} mapped=${docs.length}`);
    } catch (err) {
      console.log(`SOURCE ${source.key.padEnd(12)} error=${err.message}`);
    }
  }

  const uniqueDocs = dedupeBySlug(mergedDocs);
  const result = await upsertAnimeDocs(uniqueDocs);

  console.log('----------------------------------------');
  console.log(`Base URL   : ${BASE_URL}`);
  console.log(`Sources    : ${activeSources.length}`);
  console.log(`Fetched    : ${totalFetched}`);
  console.log(`Unique doc : ${uniqueDocs.length}`);
  console.log(`Inserted   : ${result.inserted}`);
  console.log(`Updated    : ${result.updated}`);
  console.log(`Skipped    : ${result.skipped}`);
  console.log(`Conflicted : ${result.conflicted}`);
  console.log(`Mode       : ${DRY_RUN ? 'DRY RUN' : DO_UPDATE ? 'UPSERT' : 'INSERT ONLY'}`);

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
