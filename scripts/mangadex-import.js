'use strict';
require('module-alias/register');

/**
 * MangaDex Importer — Optimized for Bulk Imports
 * Supports batching for limits > 100
 */

require('dotenv').config();
const axios    = require('axios');
const mongoose = require('mongoose');
const slugify  = require('slugify');
const { env }  = require('@core/config/env');

// ── Models ────────────────────────────────────────────────────────────────────
const { User, Manga, Chapter } = require('@models');

// ── Config ────────────────────────────────────────────────────────────────────
const MANGADEX_API   = 'https://api.mangadex.org';
const COVERS_CDN     = 'https://uploads.mangadex.org/covers';
const DELAY_MS       = 500; // Rate limit protection
const BATCH_SIZE     = 100;

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
const IMPORT_ALL      = args.includes('--all');
const DO_UPDATE       = args.includes('--update');
const LANG            = getArg('--lang') || 'id';
const NO_LANG_FILTER  = LANG === 'any' || LANG === 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const http = axios.create({
  baseURL: MANGADEX_API,
  timeout: 15000,
  headers: { 'User-Agent': 'AudiraMangaDexImporter/2.0' },
});

async function get(url, params = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await http.get(url, { params });
      return res.data;
    } catch (err) {
      if (err.response?.status === 429) {
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

function mapType(mangadexType) {
  const langMap = { ja: 'manga', ko: 'manhwa', zh: 'manhua' };
  return langMap[mangadexType] || 'manga';
}

function getCoverUrl(mangaId, relationships) {
  const cover = relationships.find((r) => r.type === 'cover_art');
  if (!cover?.attributes?.fileName) return null;
  return `${COVERS_CDN}/${mangaId}/${cover.attributes.fileName}.256.jpg`;
}

function getPerson(relationships, type) {
  const found = relationships.find((r) => r.type === type);
  return found?.attributes?.name || 'Unknown';
}

function extractGenres(tags) {
  const genres = [];
  const allowed = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Isekai'];
  for (const tag of tags) {
    const name = tag.attributes?.name?.en;
    if (name && allowed.includes(name)) genres.push(name);
  }
  return genres.length ? genres : ['Action'];
}

function getTitle(attributes) {
  if (attributes.altTitles) {
    for (const entry of attributes.altTitles) {
      if (entry.id) return entry.id;
    }
  }
  return attributes.title?.en || attributes.title?.ja || Object.values(attributes.title || {})[0] || 'Unknown';
}

async function importManga(mangaData, adminId) {
  const { id: mdId, attributes, relationships } = mangaData;
  const title = getTitle(attributes);
  const description = attributes.description?.id || attributes.description?.en || '';
  const type = mapType(attributes.originalLanguage);
  const slug = slugify(title, { lower: true, strict: true });
  
  const existing = await Manga.findOne({ slug });
  if (existing && !DO_UPDATE) return existing;

  const doc = {
    title,
    description,
    type,
    contentCategory: 'comic',
    status: attributes.status === 'ongoing' ? 'ongoing' : 'completed',
    genres: extractGenres(attributes.tags || []),
    coverImage: getCoverUrl(mdId, relationships || []),
    author: getPerson(relationships || [], 'author'),
    artist: getPerson(relationships || [], 'artist'),
    slug,
    createdBy: adminId,
    sourceKey: 'mangadex',
    sourceId: mdId,
    lastSyncedAt: new Date(),
  };

  if (existing) {
    Object.assign(existing, doc);
    return await existing.save();
  }
  return await Manga.create(doc);
}

async function main() {
  console.log(`\n🚀 Starting MangaDex Import (Limit: ${LIMIT}, Lang: ${LANG})...\n`);
  await mongoose.connect(env.MONGO_URI);
  
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) admin = await User.findOne(); // Fallback to any user

  let mangaList = [];
  let offset = 0;

  while (mangaList.length < LIMIT) {
    const currentBatch = Math.min(BATCH_SIZE, LIMIT - mangaList.length);
    const params = {
      limit: currentBatch,
      offset: offset,
      'includes[]': ['cover_art', 'author', 'artist'],
      'order[followedCount]': 'desc',
      'contentRating[]': ['safe', 'suggestive'],
    };
    if (!NO_LANG_FILTER) params['availableTranslatedLanguage[]'] = LANG;

    const data = await get('/manga', params);
    if (!data || !data.data?.length) break;

    mangaList.push(...data.data);
    process.stdout.write(`\r   📥 Fetched: ${mangaList.length} / ${LIMIT} titles`);
    
    offset += data.data.length;
    if (offset >= data.total) break;
    await sleep(DELAY_MS);
  }

  console.log(`\n\n📦 Starting DB Import for ${mangaList.length} titles...\n`);

  let success = 0;
  for (let i = 0; i < mangaList.length; i++) {
    try {
      await importManga(mangaList[i], admin._id);
      success++;
      if (i % 10 === 0) process.stdout.write(`\r   ✅ Progress: ${i + 1} / ${mangaList.length}`);
    } catch (err) {
      console.error(`\n   ❌ Failed to import: ${mangaList[i].attributes.title?.en} - ${err.message}`);
    }
  }

  console.log(`\n\nDONE! Successfully imported ${success} titles to MongoDB.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
