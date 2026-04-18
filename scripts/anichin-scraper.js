'use strict';
require('module-alias/register');


/**
 * Anichin Scraper — mengambil semua series dari anichin.cafe secara otomatis
 * dan mengimpor ke MongoDB tanpa memerlukan file JSON.
 *
 * Alur:
 *   1. Ambil sitemap anime → 500+ URL series
 *   2. Untuk setiap URL: fetch detail page → parse → upsert Manga
 *   3. Jika --episodes: parse episode list → upsert Episode
 *
 * Penggunaan:
 *   node scripts/anichin-scraper.js
 *   node scripts/anichin-scraper.js --episodes
 *   node scripts/anichin-scraper.js --limit 20 --dry-run
 *   node scripts/anichin-scraper.js --series-url https://anichin.cafe/seri/battle-through-the-heavens/
 *   node scripts/anichin-scraper.js --skip 100 --limit 50 --update
 *   node scripts/anichin-scraper.js --delay 1200
 */

require('dotenv').config();

const axios    = require('axios');
const cheerio  = require('cheerio');
const mongoose = require('mongoose');
const slugify  = require('slugify');

const { env } = require('@core/config/env');
const { Manga } = require('@models');
const { Episode } = require('@models');
const { User } = require('@models');

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null; };
const hasFlag = (flag) => args.includes(flag);

const DRY_RUN    = hasFlag('--dry-run');
const DO_UPDATE  = hasFlag('--update');
const DO_EPS     = hasFlag('--episodes');
const LIMIT      = parseInt(getArg('--limit')  || '0', 10);
const SKIP_N     = parseInt(getArg('--skip')   || '0', 10);
const DELAY_MS   = parseInt(getArg('--delay')  || '800', 10);
const SINGLE_URL = getArg('--series-url');

// ── HTTP client ───────────────────────────────────────────────────────────────
const http = axios.create({
  timeout : 15000,
  headers : {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Accept'    : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Retry wrapper — backs off on 429/503 */
async function fetch(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await http.get(url);
    } catch (err) {
      const status = err.response?.status;
      if ((status === 429 || status === 503) && attempt < retries) {
        const wait = attempt * 3000;
        console.warn(`     ⏳ HTTP ${status} — retry ${attempt}/${retries} setelah ${wait}ms`);
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
}

/** Extract slug from URL: "https://anichin.cafe/seri/battle-through-the-heavens/" → "battle-through-the-heavens" */
function slugFromUrl(url) {
  return url.replace(/\/$/, '').split('/').pop();
}

/** Compute Manga slug (same logic as pre-save hook) */
function computeSlug(title) {
  return slugify(title, { lower: true, strict: true });
}

/** Normalize type string: "Donghua" → "donghua", "ONA" → "ona" */
const TYPE_MAP = {
  donghua: 'donghua', movie: 'movie', ona: 'ona',
  anime: 'anime', manhwa: 'manhwa', manhua: 'manhua', manga: 'manga',
};
function normalizeType(raw) {
  if (!raw) return 'donghua';
  return TYPE_MAP[raw.toLowerCase().trim()] ?? 'donghua';
}

/** Normalize status string: "Ongoing" → "ongoing" */
const STATUS_MAP = {
  ongoing: 'ongoing', completed: 'completed', hiatus: 'hiatus',
  cancelled: 'cancelled', upcoming: 'upcoming',
};
function normalizeStatus(raw) {
  if (!raw) return 'ongoing';
  return STATUS_MAP[raw.toLowerCase().trim()] ?? 'ongoing';
}

/** Try to parse a date string like "June 30, 2023" → Date | null */
function parseDate(str) {
  if (!str) return null;
  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Extract the value of a `.spe` info row by key.
 * e.g. key="Status" finds <span><b>Status:</b> Ongoing</span> → "Ongoing"
 */
function getSpeValue($, key) {
  let value = '';
  $('.spe span').each(function () {
    const bText = $(this).find('b').first().text().replace(':', '').trim();
    if (bText.toLowerCase() === key.toLowerCase()) {
      value = $(this).clone().children('b').remove().end().text().trim();
      return false; // break
    }
  });
  return value;
}

// ── Parse series detail page ──────────────────────────────────────────────────
function parseSeriesPage(html, pageUrl) {
  const $ = cheerio.load(html);

  const title       = $('h1.entry-title').first().text().trim();
  const alterTitle  = $('.alter').first().text().trim() || null;
  const coverImage  = $('.thumb img').first().attr('src')
                   || $('img.ts-post-image').first().attr('src')
                   || null;

  const rawStatus   = getSpeValue($, 'Status');
  const rawType     = getSpeValue($, 'Type');
  const studio      = getSpeValue($, 'Studio')  || null;
  const network     = getSpeValue($, 'Network') || null;
  const released    = getSpeValue($, 'Released')    || null; // "Feb 18, 2023"
  const releasedOnStr = getSpeValue($, 'Released on') || null;
  const duration    = getSpeValue($, 'Duration') || null;
  const country     = getSpeValue($, 'Country')  || null;
  const epsStr      = getSpeValue($, 'Episodes');

  const genres = [];
  $('.genxed a').each(function () {
    const name = $(this).text().trim();
    if (name) genres.push(name);
  });

  // Synopsis from .synp paragraphs
  const descParts = [];
  $('.synp p').each(function () {
    const t = $(this).text().trim();
    if (t) descParts.push(t);
  });
  const description = descParts.join('\n\n').trim();

  // Rating from first .rating div text, e.g. "Rating 8.00"
  const ratingText  = $('.rating').first().text();
  const ratingMatch = ratingText.match(/([\d.]+)/);
  const rating      = ratingMatch ? Math.min(parseFloat(ratingMatch[1]), 10) : 0;

  const totalEpisodes = epsStr ? (parseInt(epsStr, 10) || null) : null;

  return {
    title,
    alterTitle,
    coverImage,
    status      : normalizeStatus(rawStatus),
    type        : normalizeType(rawType || 'Donghua'),
    studio,
    network,
    released,
    releasedOn  : parseDate(releasedOnStr),
    duration,
    country,
    genres,
    description,
    rating,
    totalEpisodes,
    sourceUrl   : pageUrl,
  };
}

// ── Parse episode list from series page ───────────────────────────────────────
function parseEpisodeList(html, seriesUrl) {
  const $ = cheerio.load(html);
  const episodes = [];

  $('.eplister li').each(function () {
    const a        = $(this).find('a');
    const href     = a.attr('href') || '';
    const epNumTxt = $(this).find('.epl-num').text().trim();
    const dateStr  = $(this).find('.epl-date').text().trim();
    const epSlug   = slugFromUrl(href);

    const epNum = parseInt(epNumTxt, 10);
    if (isNaN(epNum) || !epSlug) return; // skip unparseable

    episodes.push({
      episodeNumber : epNum,
      slug          : epSlug,
      releaseDate   : parseDate(dateStr),
      sourceUrl     : href.startsWith('http') ? href : `https://anichin.cafe${href}`,
    });
  });

  return episodes;
}

// ── Upsert series ─────────────────────────────────────────────────────────────
async function upsertSeries(payload, adminId, doUpdate) {
  const slug     = computeSlug(payload.title);
  const existing = await Manga.findOne({
    $or: [{ slug }, { sourceUrl: payload.sourceUrl }],
  });

  if (existing && !doUpdate) {
    return { action: 'skip', id: existing._id };
  }

  const data = { ...payload, createdBy: adminId };

  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return { action: 'update', id: existing._id };
  }

  const created = await Manga.create(data);
  return { action: 'create', id: created._id };
}

// ── Upsert episodes ───────────────────────────────────────────────────────────
async function upsertEpisodes(seriesId, episodes) {
  let newEps     = 0;
  let skipEps    = 0;

  for (const ep of episodes) {
    const exists = await Episode.findOne({ series: seriesId, episodeNumber: ep.episodeNumber });
    if (exists) { skipEps++; continue; }

    try {
      await Episode.create({
        series   : seriesId,
        episodeNumber: ep.episodeNumber,
        slug     : ep.slug,
        releaseDate: ep.releaseDate,
        sourceUrl: ep.sourceUrl,
      });
      newEps++;
    } catch (err) {
      if (err.code !== 11000) throw err; // ignore duplicates
      skipEps++;
    }
  }

  return { newEps, skipEps };
}

// ── Get all series URLs from sitemap ──────────────────────────────────────────
async function getSeriesUrlsFromSitemap() {
  console.log('📡  Mengambil sitemap anime...');
  const r = await fetch('https://anichin.cafe/wp-sitemap-posts-anime-1.xml');
  const matches = r.data.match(/https:\/\/anichin\.cafe\/seri\/[^<"]+/g) || [];
  // Deduplicate
  return [...new Set(matches)];
}

// ── Process one series URL ────────────────────────────────────────────────────
async function processSeries(url, adminId, doUpdate, doEps, dryRun) {
  const r    = await fetch(url);
  const data = parseSeriesPage(r.data, url);

  if (!data.title) {
    return { action: 'error', reason: 'no title found' };
  }

  let seriesId = null;
  let action   = 'skip';

  if (!dryRun) {
    const result = await upsertSeries(data, adminId, doUpdate);
    action   = result.action;
    seriesId = result.id;
  } else {
    action = 'dry-run';
    // Compute what would happen
    const slug = computeSlug(data.title);
    const exists = await Manga.findOne({ $or: [{ slug }, { sourceUrl: url }] });
    action = exists ? (doUpdate ? 'dry-update' : 'dry-skip') : 'dry-create';
  }

  let epResult = null;
  if (doEps && seriesId && !dryRun) {
    const episodes = parseEpisodeList(r.data, url);
    if (episodes.length) {
      epResult = await upsertEpisodes(seriesId, episodes);
    }
  }

  return { action, data, epResult };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   Anichin Scraper  —  anichin.cafe → MongoDB     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (DRY_RUN)   console.log('⚠   DRY RUN mode — tidak ada data yang disimpan\n');
  if (DO_UPDATE) console.log('🔄  UPDATE mode — entri yang sudah ada akan diperbarui\n');
  if (DO_EPS)    console.log('📺  EPISODES mode — episode list juga akan diimport\n');

  // Koneksi MongoDB
  await mongoose.connect(env.MONGO_URI);
  console.log('✅  Terhubung ke MongoDB\n');

  // Admin user
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    if (DRY_RUN) {
      admin = { _id: new mongoose.Types.ObjectId() };
      console.log('⚠   Admin tidak ditemukan — memakai dummy ObjectId (dry-run)\n');
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

  // Kumpulkan URL yang akan diproses
  let seriesUrls;

  if (SINGLE_URL) {
    seriesUrls = [SINGLE_URL];
    console.log(`🎯  Mode single series: ${SINGLE_URL}\n`);
  } else {
    seriesUrls = await getSeriesUrlsFromSitemap();
    console.log(`📦  Ditemukan ${seriesUrls.length} series di sitemap\n`);
  }

  // Terapkan skip & limit
  const sliced = LIMIT > 0
    ? seriesUrls.slice(SKIP_N, SKIP_N + LIMIT)
    : seriesUrls.slice(SKIP_N);

  const total = sliced.length;
  if (SKIP_N > 0) console.log(`⏩  Skip ${SKIP_N} series pertama`);
  if (LIMIT  > 0) console.log(`🔢  Limit ${LIMIT} series`);
  console.log(`🚀  Akan memproses ${total} series dengan jeda ${DELAY_MS}ms\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Statistik
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors  = 0;
  let totalNewEps  = 0;
  let totalSkipEps = 0;

  for (let i = 0; i < sliced.length; i++) {
    const url      = sliced[i];
    const progress = `[${i + 1}/${total}]`;
    const urlSlug  = slugFromUrl(url);

    await sleep(DELAY_MS);

    try {
      const res = await processSeries(url, admin._id, DO_UPDATE, DO_EPS, DRY_RUN);

      const epInfo = res.epResult
        ? ` | +${res.epResult.newEps}ep`
        : '';

      switch (res.action) {
        case 'create':
          console.log(`${progress} ✅ Diimport : ${res.data?.title || urlSlug}${epInfo}`);
          created++;
          break;
        case 'update':
          console.log(`${progress} 🔄 Diperbarui: ${res.data?.title || urlSlug}${epInfo}`);
          updated++;
          break;
        case 'skip':
          console.log(`${progress} ⏭  Skip (ada) : ${res.data?.title || urlSlug}`);
          skipped++;
          break;
        case 'dry-create':
          console.log(`${progress} 🔍 DRY baru  : ${res.data?.title || urlSlug} [${res.data?.type}/${res.data?.status}]`);
          created++;
          break;
        case 'dry-update':
          console.log(`${progress} 🔍 DRY update: ${res.data?.title || urlSlug}`);
          updated++;
          break;
        case 'dry-skip':
          console.log(`${progress} 🔍 DRY skip  : ${res.data?.title || urlSlug}`);
          skipped++;
          break;
        case 'error':
          console.warn(`${progress} ⚠  ${res.reason}: ${urlSlug}`);
          errors++;
          break;
      }

      if (res.epResult) {
        totalNewEps  += res.epResult.newEps;
        totalSkipEps += res.epResult.skipEps;
      }
    } catch (err) {
      const status = err.response?.status;
      console.error(`${progress} ❌ Error [${status || err.code || 'unknown'}]: ${urlSlug} — ${err.message}`);
      errors++;
    }
  }

  // Ringkasan
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊  Ringkasan:');
  console.log(`    ✅  Diimport   : ${created}`);
  console.log(`    🔄  Diperbarui : ${updated}`);
  console.log(`    ⏭   Dilewati   : ${skipped}`);
  console.log(`    ❌  Error      : ${errors}`);
  if (DO_EPS) {
    console.log(`    📺  Episode baru  : ${totalNewEps}`);
    console.log(`    📺  Episode skip  : ${totalSkipEps}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('💥  Fatal error:', err.message);
  process.exit(1);
});
