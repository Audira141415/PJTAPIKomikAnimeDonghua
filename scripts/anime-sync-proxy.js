'use strict';
require('module-alias/register');


require('dotenv').config();

const axios = require('axios');
const mongoose = require('mongoose');
const slugify = require('slugify');

const { env } = require('@core/config/env');
const { Manga } = require('@models');
const { User } = require('@models');

const args = process.argv.slice(2);
const hasFlag = (flag) => args.includes(flag);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 ? args[i + 1] : null;
};

const BASE_URL = getArg('--base-url') || process.env.SCRAPER_API_BASE_URL || `http://localhost:${env.PORT || 3000}/api/v1`;
const LIMIT_PER_SOURCE = parseInt(getArg('--limit') || '20', 10);
const DO_UPDATE = hasFlag('--update');
const DRY_RUN = hasFlag('--dry-run');
const ONLY_SOURCE = getArg('--source');
const AUDIT_ONLY = hasFlag('--audit');
const AUDIT_SAMPLE_SIZE = parseInt(getArg('--audit-sample') || '5', 10);

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

const ALLOWED_ANIMATION_TYPES = new Set(['anime', 'donghua', 'ona', 'movie']);

const SOURCE_FORCED_TYPE = {
  donghub: 'donghua',
  drachin: 'donghua',
};

const SOURCE_DEFAULT_TYPE = {};

const SOURCE_TYPE_HINTS = {
  donghub:   { donghua: 3 },
  drachin:   { donghua: 3 },
  winbu:     { donghua: 1, anime: 1 },
  dramabox:  { donghua: 1, movie: 2 },
  anime:     { anime: 2 },
  samehadaku:{ anime: 2 },
  animasu:   { anime: 2 },
  kusonime:  { anime: 2 },
  anoboy:    { anime: 2 },
  animesail: { anime: 2 },
  oploverz:  { anime: 2 },
  stream:    { anime: 2 },
  animekuindo:{ anime: 2 },
  nimegami:  { anime: 2 },
  alqanime:  { anime: 2 },
};

const client = axios.create({
  timeout: 20000,
  headers: { 'User-Agent': 'AudiraAnimeSync/1.0' },
});

const PROXY_SOURCE_KEYS = new Set(SOURCE_ENDPOINTS.map((s) => s.key));

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

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function includesAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function inferConfidence(score) {
  if (score >= 100) return 0.99;
  if (score >= 8) return 0.92;
  if (score >= 6) return 0.85;
  if (score >= 4) return 0.75;
  if (score >= 2) return 0.65;
  return 0.55;
}

function inferAnimationType(item, sourceKey) {
  const forcedType = SOURCE_FORCED_TYPE[sourceKey];
  if (forcedType) {
    return {
      type: forcedType,
      confidence: 0.99,
      reason: `forced-source:${sourceKey}`,
    };
  }

  const score = { anime: 0, donghua: 0, ona: 0, movie: 0 };
  const reasons = { anime: [], donghua: [], ona: [], movie: [] };

  const addScore = (type, points, reason) => {
    if (!Object.prototype.hasOwnProperty.call(score, type)) return;
    score[type] += points;
    reasons[type].push(reason);
  };

  const rawTypeText = normalizeText(pickFirst(item.type, item.format, item.kind, item.category, item.label, item.genreType));
  const titleText = normalizeText(pickFirst(item.title, item.name, item.animeTitle));
  const statusText = normalizeText(item.status);
  const countryText = normalizeText(pickFirst(item.country, item.origin));
  const genreText = normalizeText(normalizeGenres(item.genres).join(' '));
  const sourceText = normalizeText(sourceKey);

  if (includesAny(rawTypeText, ['donghua'])) addScore('donghua', 8, `raw-type:${rawTypeText}`);
  if (includesAny(rawTypeText, ['ona'])) addScore('ona', 8, `raw-type:${rawTypeText}`);
  if (includesAny(rawTypeText, ['movie', 'film'])) addScore('movie', 8, `raw-type:${rawTypeText}`);
  if (includesAny(rawTypeText, ['anime', 'tv'])) addScore('anime', 6, `raw-type:${rawTypeText}`);

  if (includesAny(rawTypeText, ['chinese', 'china', 'cn'])) addScore('donghua', 4, `raw-locale:${rawTypeText}`);
  if (includesAny(countryText, ['china', 'chinese', 'cn'])) addScore('donghua', 4, `country:${countryText}`);
  if (includesAny(genreText, ['donghua', 'chinese'])) addScore('donghua', 3, `genre:${genreText}`);

  if (includesAny(titleText, ['donghua'])) addScore('donghua', 4, `title:${titleText}`);
  if (includesAny(titleText, ['movie', 'film'])) addScore('movie', 4, `title:${titleText}`);
  if (includesAny(statusText, ['movie'])) addScore('movie', 2, `status:${statusText}`);

  const sourceHints = SOURCE_TYPE_HINTS[sourceKey] || {};
  Object.entries(sourceHints).forEach(([type, points]) => {
    addScore(type, points, `source-hint:${sourceKey}`);
  });

  if (sourceText.includes('dong')) addScore('donghua', 2, `source-name:${sourceText}`);

  const ranked = Object.entries(score).sort((a, b) => b[1] - a[1]);
  const [bestType, bestScore] = ranked[0];
  const [runnerUpType, runnerUpScore] = ranked[1];

  if (bestScore <= 0) {
    const fallbackType = SOURCE_DEFAULT_TYPE[sourceKey] || 'anime';
    return {
      type: fallbackType,
      confidence: 0.5,
      reason: `fallback:${sourceKey || 'default'}`,
    };
  }

  const confidence = Math.max(0.5, inferConfidence(bestScore - runnerUpScore >= 2 ? bestScore : bestScore - 1));
  const reason = reasons[bestType][0] || `score:${bestType}:${bestScore}`;

  return {
    type: bestType,
    confidence,
    reason,
  };
}

function detectAnimationType(item, sourceKey) {
  return inferAnimationType(item, sourceKey).type;
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

  const inferred = inferAnimationType(item, sourceKey);
  const detectedType = inferred.type;

  return {
    title,
    slug,
    type: ALLOWED_ANIMATION_TYPES.has(detectedType) ? detectedType : 'anime',
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
    inferenceConfidence: inferred.confidence,
    inferenceReason: inferred.reason,
  };
}

function printAuditReport(auditRows) {
  if (!auditRows.length) {
    console.log('AUDIT: tidak ada data untuk ditampilkan.');
    return;
  }

  const grouped = new Map();
  auditRows.forEach((row) => {
    if (!grouped.has(row.source)) {
      grouped.set(row.source, []);
    }
    grouped.get(row.source).push(row);
  });

  console.log('========================================');
  console.log('ANIMATION TYPE AUDIT (sampling by source)');
  console.log('========================================');

  grouped.forEach((rows, source) => {
    const counts = rows.reduce((acc, row) => {
      acc[row.type] = (acc[row.type] || 0) + 1;
      return acc;
    }, {});
    console.log(`SOURCE ${source} total=${rows.length} byType=${JSON.stringify(counts)}`);

    rows
      .slice(0, AUDIT_SAMPLE_SIZE)
      .forEach((row) => {
        const confidence = typeof row.confidence === 'number' ? row.confidence.toFixed(2) : '0.00';
        console.log(`  - [${row.type}] conf=${confidence} title="${row.title}" reason=${row.reason}`);
      });
  });
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

function isProxyManagedRecord(existing) {
  if (!existing) return false;
  if (existing.contentCategory !== 'animation') return false;
  const network = typeof existing.network === 'string' ? existing.network.trim() : '';
  return network !== '' && PROXY_SOURCE_KEYS.has(network);
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
    // If same slug already belongs to non-animation content, skip to avoid collisions.
    if (existing && !ALLOWED_ANIMATION_TYPES.has(existing.type)) {
      conflicted += 1;
      continue;
    }

    if (existing && !DO_UPDATE) {
      skipped += 1;
      continue;
    }

    if (existing && DO_UPDATE && !isProxyManagedRecord(existing)) {
      conflicted += 1;
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

  if (AUDIT_ONLY && (!Number.isInteger(AUDIT_SAMPLE_SIZE) || AUDIT_SAMPLE_SIZE <= 0)) {
    throw new Error('Argumen --audit-sample harus bilangan bulat > 0.');
  }

  let admin = null;
  if (!AUDIT_ONLY) {
    await mongoose.connect(env.MONGO_URI);
    admin = await ensureAdminUser();
  }

  const activeSources = ONLY_SOURCE
    ? SOURCE_ENDPOINTS.filter((s) => s.key === ONLY_SOURCE)
    : SOURCE_ENDPOINTS;

  if (!activeSources.length) {
    throw new Error(`Source tidak ditemukan: ${ONLY_SOURCE}`);
  }

  let totalFetched = 0;
  const mergedDocs = [];
  const auditRows = [];

  for (const source of activeSources) {
    try {
      const rawItems = await fetchSourceItems(source);
      totalFetched += rawItems.length;

      if (AUDIT_ONLY) {
        rawItems.forEach((item) => {
          const title = pickFirst(item.title, item.name, item.animeTitle) || '(untitled)';
          const inferred = inferAnimationType(item, source.key);
          auditRows.push({
            source: source.key,
            title,
            type: inferred.type,
            confidence: inferred.confidence,
            reason: inferred.reason,
          });
        });
      }

      if (!AUDIT_ONLY) {
        const docs = rawItems
          .map((item) => mapToAnimeDoc(item, source.key, admin._id))
          .filter(Boolean);

        mergedDocs.push(...docs);
        console.log(`SOURCE ${source.key.padEnd(12)} fetched=${rawItems.length} mapped=${docs.length}`);
      } else {
        console.log(`SOURCE ${source.key.padEnd(12)} fetched=${rawItems.length} audit=${rawItems.length}`);
      }
    } catch (err) {
      console.log(`SOURCE ${source.key.padEnd(12)} error=${err.message}`);
    }
  }

  if (AUDIT_ONLY) {
    printAuditReport(auditRows);
    return;
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
