'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://kusonime.com';
const FALLBACK_BASE_URLS = [DEFAULT_BASE_URL];
const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.KUSONIME_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fromSingle = process.env.KUSONIME_BASE_URL ? [process.env.KUSONIME_BASE_URL.trim()] : [];
  return [...new Set([...fromList, ...fromSingle, ...FALLBACK_BASE_URLS])];
}

const BASE_URLS = parseBaseUrls();
let activeBaseUrl = BASE_URLS[0] || DEFAULT_BASE_URL;

const getBaseUrl = () => activeBaseUrl;

const slugFromUrl = (url = '') => {
  if (!url) return '';
  try {
    const path = url.startsWith('http') ? new URL(url).pathname : url;
    return path.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
  } catch {
    return url.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
  }
};

const buildUrl = (baseUrl, path, params) => {
  let url = `${baseUrl}${path}`;
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    ).toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
};

async function get(path, params, { cacheTtlMs = CACHE_TTL_MS } = {}) {
  const cacheKey = `kusonime:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}`;

  return remember(cacheKey, cacheTtlMs, async () => {
    const candidateBaseUrls = [
      activeBaseUrl,
      ...BASE_URLS.filter((baseUrl) => baseUrl !== activeBaseUrl),
    ];

    let lastError = null;
    for (const baseUrl of candidateBaseUrls) {
      try {
        const html = await playwrightGet(buildUrl(baseUrl, path, params));
        activeBaseUrl = baseUrl;
        return html;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Failed to fetch kusonime path ${path}`);
  });
}

function parseGenresFromText($, el) {
  const genres = [];
  $(el).find('a[href*="/genres/"]').each((_, genreAnchor) => {
    const name = $(genreAnchor).text().trim();
    const href = $(genreAnchor).attr('href') || '';
    const slug = slugFromUrl(href);
    if (name && slug) genres.push({ name, slug });
  });
  return [...new Map(genres.map((genre) => [genre.slug, genre])).values()];
}

function parseKusoCard($, anchor) {
  const $a = $(anchor);
  const href = $a.attr('href') || '';
  const slug = slugFromUrl(href);
  if (!slug) return null;

  const container = $a.closest('li, .detpost, .kover, .venz, .venutama, .venser, .content, .post');
  const title = $a.attr('title') || $a.text().trim();
  const poster = (
    container.find('img').first().attr('src') ||
    container.find('img').first().attr('data-src') ||
    ''
  );

  let released = container.find('.epx, .epxs, .released, .date, time').first().text().trim();
  if (!released) {
    const rawText = container.text().replace(/\s+/g, ' ').trim();
    const relMatch = rawText.match(/(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    released = relMatch ? relMatch[1] : '';
  }

  return {
    title,
    slug,
    poster,
    genres: parseGenresFromText($, container),
    released: released || null,
    url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    id: slug,
    source: 'kusonime',
  };
}

function parseKusoListing(html) {
  const $ = cheerio.load(html);
  const anime_list = [];
  const seen = new Set();

  $('a[href*="subtitle-indonesia"], a[title][href*="kusonime.com/"]').each((_, anchor) => {
    const card = parseKusoCard($, anchor);
    if (!card || seen.has(card.slug)) return;
    seen.add(card.slug);
    anime_list.push(card);
  });

  const pageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPageText = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)').last().text().trim();
  const currentPage = Number.parseInt(pageText, 10) || 1;
  const totalPages = Number.parseInt(lastPageText, 10) || currentPage;

  return {
    anime_list,
    animeList: anime_list,
    currentPage,
    totalPages,
    pagination: {
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1,
      currentPage,
    },
  };
}

function parseKusoDetail(html, slug) {
  const $ = cheerio.load(html);

  const title = $('h1.jdlz, h1.entry-title, h1').first().text().trim() || slug;
  const poster = $('.post-thumb img, .venutama img').first().attr('src') || null;

  const info = {};
  $('.info p').each((_, p) => {
    const key = $(p).find('b').first().text().replace(':', '').trim();
    const value = $(p).clone().children('b').remove().end().text().trim();
    if (key && value) info[key.toLowerCase().replace(/\s+/g, '_')] = value;
  });

  const synopsis = $('.sinopc, .sinop, .desc, .entry-content p').first().text().trim() || null;

  const genres = [];
  $('.info a[href*="/genres/"]').each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr('href') || '';
    const genreSlug = slugFromUrl(href);
    if (name && genreSlug) genres.push({ name, slug: genreSlug });
  });

  const dedupGenres = [...new Map(genres.map((genre) => [genre.slug, genre])).values()];

  const download_links = [];
  const htmlMatches = html.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi) || [];
  htmlMatches.forEach((rawAnchor) => {
    const hrefMatch = rawAnchor.match(/href="([^"]+)"/i);
    const textMatch = rawAnchor.match(/>([^<]+)<\/a>/i);
    const href = hrefMatch ? hrefMatch[1] : '';
    const label = textMatch ? textMatch[1].trim() : '';
    if (!href || href === '#') return;
    if (!/shrinkearn|drive\.google|pixeldrain|terabox|hxfile|racaty|krakenfiles|mega\.nz|mediafire/i.test(href)) return;
    download_links.push({ label: label || 'Download', url: href });
  });

  return {
    title,
    slug,
    poster,
    info,
    synopsis,
    genres: dedupGenres,
    download_links,
    url: `${getBaseUrl()}/${slug}/`,
    source: 'kusonime',
    id: slug,
  };
}

async function getLatest({ page = 1 } = {}) {
  const path = page > 1 ? `/page/${page}/` : '/';
  const html = await get(path);
  return parseKusoListing(html);
}

async function getAllAnime({ page = 1 } = {}) {
  const path = page > 1 ? `/anime-list/page/${page}/` : '/anime-list/';
  const html = await get(path);
  return parseKusoListing(html);
}

async function getMovies({ page = 1 } = {}) {
  const path = page > 1 ? `/category/anime-movie/page/${page}/` : '/category/anime-movie/';
  const html = await get(path);
  return parseKusoListing(html);
}

async function getByType(type, { page = 1 } = {}) {
  const paths = [
    page > 1 ? `/category/${type}/page/${page}/` : `/category/${type}/`,
    page > 1 ? `/category/anime-${type}/page/${page}/` : `/category/anime-${type}/`,
  ];

  let html = null;
  let lastError = null;
  for (const path of paths) {
    try {
      html = await get(path);
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!html) throw lastError || new Error(`Unable to fetch kusonime type ${type}`);
  return parseKusoListing(html);
}

async function getAllGenres() {
  const html = await get('/genres/action/');
  const $ = cheerio.load(html);
  const genres = [];
  const seen = new Set();

  $('a[href*="/genres/"]').each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr('href') || '';
    if (!name || !href || /^\d+$/.test(name)) return;
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    genres.push({ name, slug });
  });

  return { genres };
}

async function getAllSeasons() {
  const [homeHtml, animeListHtml] = await Promise.all([
    get('/'),
    get('/anime-list/'),
  ]);

  const $ = cheerio.load(homeHtml);
  const seasons = [];
  const seen = new Set();

  const addSeason = (name, slug) => {
    if (!name || !slug || seen.has(slug)) return;
    seen.add(slug);
    seasons.push({ name, slug });
  };

  addSeason('Anime Movie', 'movie');
  addSeason('Anime ONA', 'ona');
  addSeason('Anime OVA', 'ova');
  addSeason('Anime Special', 'special');

  const allHtml = `${homeHtml}\n${animeListHtml}`;
  const regexMatches = allHtml.match(/\/season\/([a-z]+-\d{4})\//gi) || [];
  regexMatches.forEach((match) => {
    const slugMatch = match.match(/\/season\/([^/]+)\//i);
    const slug = slugMatch ? slugMatch[1] : '';
    if (!slug) return;
    const words = slug.split('-');
    const year = words.pop();
    const seasonName = words.join(' ');
    const name = `${seasonName.replace(/\b\w/g, (char) => char.toUpperCase())} ${year}`.trim();
    addSeason(name, slug);
  });

  $('a[href*="/season/"]').each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr('href') || '';
    if (!name || !href || /^\d+$/.test(name)) return;
    const slug = slugFromUrl(href);
    addSeason(name, slug);
  });

  try {
    const seasonSitemapUrl = `${getBaseUrl()}/season-sitemap.xml`;
    const sitemapResponse = await axios.get(seasonSitemapUrl, {
      timeout: 20_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    });

    const sitemapText = String(sitemapResponse.data || '');
    const sitemapMatches = sitemapText.match(/https?:\/\/[^\s<"]+\/season\/([a-z]+-\d{4})\//gi) || [];
    sitemapMatches.forEach((fullUrl) => {
      const slugMatch = fullUrl.match(/\/season\/([^/]+)\//i);
      const slug = slugMatch ? slugMatch[1] : '';
      if (!slug) return;
      const words = slug.split('-');
      const year = words.pop();
      const seasonName = words.join(' ');
      const name = `${seasonName.replace(/\b\w/g, (char) => char.toUpperCase())} ${year}`.trim();
      addSeason(name, slug);
    });
  } catch {
    // Ignore sitemap failures and keep menu-derived seasons.
  }

  return { seasons };
}

async function search(query, { page = 1 } = {}) {
  const keyword = String(query || '').trim();
  if (!keyword) return { anime_list: [], animeList: [], currentPage: page, totalPages: page, pagination: { hasNext: false, hasPrev: page > 1, currentPage: page } };
  const html = await get('/', { s: keyword, page: page > 1 ? page : undefined });
  return parseKusoListing(html);
}

async function getByGenre(slug, { page = 1 } = {}) {
  const path = page > 1 ? `/genres/${slug}/page/${page}/` : `/genres/${slug}/`;
  const html = await get(path);
  return parseKusoListing(html);
}

async function getBySeason(season, year, { page = 1 } = {}) {
  const seasonSlug = `${season}-${year}`;
  const path = page > 1 ? `/season/${seasonSlug}/page/${page}/` : `/season/${seasonSlug}/`;
  const html = await get(path);
  return parseKusoListing(html);
}

async function getDetail(slug) {
  const html = await get(`/${slug}/`);
  return parseKusoDetail(html, slug);
}

module.exports = {
  getLatest,
  getAllAnime,
  getMovies,
  getByType,
  getAllGenres,
  getAllSeasons,
  search,
  getByGenre,
  getBySeason,
  getDetail,
};
