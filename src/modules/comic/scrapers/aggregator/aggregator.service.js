'use strict';

/**
 * Aggregator Service
 * Unified interface across all 13 comic scraper sources.
 *
 * Endpoints:
 *   sources GET /comic/aggregator/sources
 *   latest  GET /comic/aggregator/latest?sources=all&page=1
 *   search  GET /comic/aggregator/search?q=naruto&sources=all&page=1
 */

/* ── Source registry ─────────────────────────────────────────────────────────
   Map each source to:
     - key        : identifier used in ?sources= query param
     - label      : display name
     - latest(p)  : function returning list of latest comics
     - search(q,p): function returning search results
   All functions must return an object that contains an array of comic cards.
   The aggregator normalizes the card shape from each source.
   ─────────────────────────────────────────────────────────────────────────── */
const bakkomik    = require('../bacakomik/bacakomik.service');
const komikstation = require('../komikstation/komikstation.service');
const mangakita   = require('../mangakita/mangakita.service');
const maid        = require('../maid/maid.service');
const komikindo   = require('../komikindo/komikindo.service');
const soulscan    = require('../soulscan/soulscan.service');
const bacaman     = require('../bacaman/bacaman.service');
const meganei     = require('../meganei/meganei.service');
const softkomik   = require('../softkomik/softkomik.service');
const westmanga   = require('../westmanga/westmanga.service');
const mangasusuku = require('../mangasusuku/mangasusuku.service');
const kiryuu      = require('../kiryuu/kiryuu.service');
const cosmic      = require('../cosmic/cosmic.service');
const { normalizeCard } = require('./cardNormalizer');

/**
 * Extract the first array of comics from a scraper response.
 * Each scraper returns data in slightly different shapes; this handles:
 *   { komikList:[...] }
 *   { latestUpdates:[...] }
 *   { popularToday:[...] }
 *   { hot:[...], latestUpdates:[...] }
 *   { results: [...] }   (Westmanga JSON API)
 *   array directly
 */
const extractCards = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;

  /* Priority list: prefer arrays that look like comic lists */
  const arrKeys = [
    'komikList', 'comics', 'results', 'data',
    'latestUpdates', 'popularToday', 'latest', 'popular',
    'trending', 'hot', 'hotComics', 'hotProjects',
    'recommendations', 'home',
  ];
  for (const key of arrKeys) {
    if (Array.isArray(data[key]) && data[key].length > 0) return data[key];
  }
  return [];
};

/**
 * Normalize a card from any scraper into a common shape.
 * Handles both HTML-scraped cards (slug, title, cover, chapter)
 * and JSON API cards (Westmanga / Meganei WP REST).
 */
/* ── Source definitions ───────────────────────────────────────────────────── */
const SOURCES = {
  bacakomik: {
    label:  'BacaKomik',
    latest: (p) => bakkomik.latest(p),
    search: (q)  => bakkomik.search(q),
  },
  komikstation: {
    label:  'KomikStation',
    latest: (p) => komikstation.list(p),
    search: (q)  => komikstation.search(q),
  },
  mangakita: {
    label:  'MangaKita',
    latest: (p) => mangakita.home(p),
    search: (q)  => mangakita.search(q),
  },
  maid: {
    label:  'Maid Comic',
    latest: (p) => maid.latest(p),
    search: (q)  => maid.search(q),
  },
  komikindo: {
    label:  'Komikindo',
    latest: (p) => komikindo.latest(p),
    search: (q)  => komikindo.search(q),
  },
  soulscan: {
    label:  'SoulScans',
    latest: (p) => soulscan.latest(p),
    search: (q)  => soulscan.search(q),
  },
  bacaman: {
    label:  'Bacaman',
    latest: (p) => bacaman.latest(p),
    search: (q)  => bacaman.search(q),
  },
  meganei: {
    label:  'Meganei',
    latest: (p) => meganei.latest(p),
    search: (q)  => meganei.search(q),
  },
  softkomik: {
    label:  'Softkomik',
    latest: (p) => softkomik.latest(p),
    search: (q)  => softkomik.search(q),
  },
  westmanga: {
    label:  'Westmanga',
    latest: (p) => westmanga.latest(p),
    search: (q)  => westmanga.search(q),
  },
  mangasusuku: {
    label:  'MangaSusuku',
    latest: (p) => mangasusuku.latest(p),
    search: (q)  => mangasusuku.search(q),
  },
  kiryuu: {
    label:  'Kiryuu',
    latest: (p) => kiryuu.latest(p),
    search: (q)  => kiryuu.search(q),
  },
  cosmic: {
    label:  'Cosmic Scans',
    latest: (p) => cosmic.latest(p),
    search: (q)  => cosmic.search(q),
  },
};

const ALL_SOURCE_KEYS = Object.keys(SOURCES);

/* Parse ?sources=bacakomik,komikindo or ?sources=all */
const parseSources = (raw) => {
  if (!raw || raw === 'all') return ALL_SOURCE_KEYS;
  const keys = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return keys.filter(k => SOURCES[k]); /* silently ignore unknown keys */
};

/* Run tasks in parallel; collect both fulfilled and rejected */
const settleAll = (tasks) =>
  Promise.allSettled(tasks).then(results =>
    results.map((r, i) => ({
      fulfilled: r.status === 'fulfilled',
      value: r.status === 'fulfilled' ? r.value : null,
      error: r.status === 'rejected'  ? r.reason?.message || String(r.reason) : null,
      index: i,
    }))
  );

/* ── Public API ───────────────────────────────────────────────────────────── */

/**
 * List all registered sources with their keys and labels.
 */
const sources = () => ({
  sources: ALL_SOURCE_KEYS.map(key => ({
    key,
    label: SOURCES[key].label,
    endpoints: {
      latest: `/comic/${key}/latest`,
      search: `/comic/${key}/search`,
    },
  })),
  total: ALL_SOURCE_KEYS.length,
});

/**
 * Fetch latest comics from requested sources in parallel.
 * Returns merged list grouped by source with per-source status.
 */
const latest = async (sourceParam, page = 1) => {
  const keys   = parseSources(sourceParam);
  const tasks  = keys.map(k => SOURCES[k].latest(page));
  const settled = await settleAll(tasks);

  const perSource = [];
  const merged    = [];

  for (let i = 0; i < keys.length; i++) {
    const key    = keys[i];
    const result = settled[i];
    const cards  = result.fulfilled
      ? extractCards(result.value).map(c => normalizeCard(c, key)).filter(Boolean)
      : [];

    perSource.push({
      source: key,
      label:  SOURCES[key].label,
      ok:     result.fulfilled,
      error:  result.error,
      count:  cards.length,
    });
    merged.push(...cards);
  }

  return {
    page:      +page,
    sources:   perSource,
    total:     merged.length,
    komikList: merged,
  };
};

/**
 * Search across requested sources in parallel.
 */
const search = async (q, sourceParam, page = 1) => {
  if (!q) return { query: q, sources: [], total: 0, komikList: [] };

  const keys    = parseSources(sourceParam);
  const tasks   = keys.map(k => SOURCES[k].search(q, page));
  const settled = await settleAll(tasks);

  const perSource = [];
  const merged    = [];

  for (let i = 0; i < keys.length; i++) {
    const key    = keys[i];
    const result = settled[i];
    const cards  = result.fulfilled
      ? extractCards(result.value).map(c => normalizeCard(c, key)).filter(Boolean)
      : [];

    perSource.push({
      source: key,
      label:  SOURCES[key].label,
      ok:     result.fulfilled,
      error:  result.error,
      count:  cards.length,
    });
    merged.push(...cards);
  }

  return {
    query:     q,
    page:      +page,
    sources:   perSource,
    total:     merged.length,
    komikList: merged,
  };
};

module.exports = { sources, latest, search };
