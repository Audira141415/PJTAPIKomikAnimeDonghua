'use strict';

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://animesail.com';
const FALLBACK_BASE_URLS = [DEFAULT_BASE_URL];
const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.ANIMESAIL_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fromSingle = process.env.ANIMESAIL_BASE_URL ? [process.env.ANIMESAIL_BASE_URL.trim()] : [];
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

function isChallengePage(html = '') {
  return /<title[^>]*>\s*Loading\.\.\s*<\/title>/i.test(html) || /challenges\.cloudflare\.com\/turnstile/i.test(html);
}

async function get(path, params, { cacheTtlMs = CACHE_TTL_MS, allowChallenge = false } = {}) {
  const cacheKey = `animesail:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}:${allowChallenge}`;

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
        if (!allowChallenge && isChallengePage(html)) {
          throw new Error(`AnimeSail challenge page for ${path}`);
        }
        return html;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Failed to fetch animesail path ${path}`);
  });
}

function parseCardText(text = '') {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/^(.*?)\s+Subtitle Indonesia\s+([A-Za-z0-9-]+)\s+·\s+(.+)$/i);
  if (match) {
    return {
      title: match[1].trim(),
      type: match[2].trim(),
      status: match[3].trim(),
    };
  }
  return {
    title: normalized,
    type: null,
    status: null,
  };
}

function parseAnimeCard($, el) {
  const $el = $(el);
  const anchor = $el.is('a') ? $el : $el.find('a[href*="/anime/"]').first();
  const href = anchor.attr('href') || '';
  if (!href) return null;

  const slug = slugFromUrl(href);
  if (!slug) return null;

  const textParts = parseCardText(anchor.text());
  const title = (
    $el.find('.tt').first().text().trim() ||
    anchor.attr('title') ||
    textParts.title ||
    slug
  );
  const poster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  const episode = $el.find('.epx, .epxs, .ep').first().text().trim() || null;
  const type = $el.find('.typez').first().text().trim() || textParts.type;
  const status = $el.find('.sb, .status').first().text().trim() || textParts.status || null;

  return {
    title,
    slug,
    poster,
    episode,
    type,
    status,
    url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    href: `/animesail/detail/${slug}`,
    id: slug,
    source: 'animesail',
  };
}

function parseListingPage(html, { currentPage = 1 } = {}) {
  const $ = cheerio.load(html);
  const anime_list = [];
  const seen = new Set();

  $('.bsx, article.bs, .listupd article.bs').each((_, el) => {
    const card = parseAnimeCard($, el);
    if (!card || seen.has(card.slug)) return;
    seen.add(card.slug);
    anime_list.push(card);
  });

  const pageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPageText = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)').last().text().trim();
  const parsedCurrentPage = Number.parseInt(pageText, 10) || currentPage;
  const totalPages = Number.parseInt(lastPageText, 10) || parsedCurrentPage;

  return {
    anime_list,
    animeList: anime_list,
    pagination: {
      hasNext: parsedCurrentPage < totalPages,
      hasPrev: parsedCurrentPage > 1,
      currentPage: parsedCurrentPage,
    },
  };
}

function emptyList(page = 1) {
  return {
    anime_list: [],
    animeList: [],
    pagination: {
      hasNext: false,
      hasPrev: page > 1,
      currentPage: page,
    },
  };
}

async function tryList(path, { page = 1, params } = {}) {
  try {
    const targetPath = page > 1 && !path.includes('?') ? `${path.replace(/\/$/, '')}/page/${page}/` : path;
    const html = await get(targetPath, params);
    return parseListingPage(html, { currentPage: page });
  } catch (error) {
    if (!/challenge page/i.test(String(error?.message || ''))) {
      throw error;
    }
    return emptyList(page);
  }
}

async function getHome({ page = 1 } = {}) {
  return tryList(page > 1 ? `/page/${page}/` : '/', { page });
}

async function getTerbaru({ page = 1 } = {}) {
  return tryList(page > 1 ? `/anime/page/${page}/` : '/anime/', { page });
}

async function getDonghua({ page = 1 } = {}) {
  return tryList(page > 1 ? `/genres/donghua/page/${page}/` : '/genres/donghua/', { page });
}

async function getMovies({ page = 1 } = {}) {
  return tryList(page > 1 ? `/movie-terbaru/page/${page}/` : '/movie-terbaru/', { page });
}

async function getSchedule() {
  try {
    const html = await get('/jadwal-tayang/');
    const $ = cheerio.load(html);
    const days = [];
    $('.sched, .schedule, .day, .bs').each((_, section) => {
      const name = $(section).find('h2, h3, .title').first().text().trim();
      const animeList = [];
      $(section).find('.bsx, article.bs').each((__, cardEl) => {
        const card = parseAnimeCard($, cardEl);
        if (card) animeList.push(card);
      });
      if (name && animeList.length) days.push({ day: name, anime_list: animeList, animeList });
    });
    return { days };
  } catch (error) {
    if (!/challenge page/i.test(String(error?.message || ''))) {
      throw error;
    }
    return { days: [] };
  }
}

async function getList() {
  return tryList('/anime/');
}

async function search(query, { page = 1 } = {}) {
  const q = String(query || '').trim();
  if (!q) return emptyList(page);
  return tryList('/', { page, params: { s: q } });
}

async function getAllGenres() {
  try {
    const html = await get('/', { s: 'naruto' });
    const $ = cheerio.load(html);
    const genres = [];
    const seen = new Set();

    $('a[href*="/genres/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const name = $(el).text().trim();
      const slug = slugFromUrl(href);
      if (!slug || !name || seen.has(slug)) return;
      seen.add(slug);
      genres.push({ name, slug });
    });

    return { genres };
  } catch (error) {
    if (!/challenge page/i.test(String(error?.message || ''))) {
      throw error;
    }
    return { genres: [] };
  }
}

async function getByGenre(slug, { page = 1 } = {}) {
  return tryList(page > 1 ? `/genres/${slug}/page/${page}/` : `/genres/${slug}/`, { page });
}

async function getBySeason(slug, { page = 1 } = {}) {
  return tryList(page > 1 ? `/season/${slug}/page/${page}/` : `/season/${slug}/`, { page });
}

async function getByStudio(slug, { page = 1 } = {}) {
  return tryList(page > 1 ? `/studio/${slug}/page/${page}/` : `/studio/${slug}/`, { page });
}

async function getDetail(slug) {
  try {
    const html = await get(`/anime/${slug}/`);
    const $ = cheerio.load(html);
    const title = $('h1.entry-title,h1').first().text().trim() || slug;
    const poster = (
      $('.thumb img, .bigcontent img, .post-thumb img').first().attr('src') ||
      $('.thumb img, .bigcontent img, .post-thumb img').first().attr('data-src') ||
      null
    );
    const synopsis = $('.entry-content, .desc, .sinopsis').first().text().replace(/\s+/g, ' ').trim() || '';
    const rating = $('.num, .rating-prc, .numscore').first().text().replace(/[^0-9.AN\/]/gi, '').trim() || 'N/A';
    const genres = [];
    $('a[href*="/genres/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const name = $(el).text().trim();
      const genreSlug = slugFromUrl(href);
      if (name && genreSlug) genres.push({ name, slug: genreSlug });
    });
    const dedupGenres = [...new Map(genres.map((genre) => [genre.slug, genre])).values()];
    const episodes = [];
    $('a[href*="episode-"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const name = $(el).text().trim();
      const episodeSlug = slugFromUrl(href);
      if (!href || !episodeSlug) return;
      episodes.push({ title: name || episodeSlug, slug: episodeSlug });
    });

    return {
      title,
      poster,
      synopsis,
      rating,
      batch_link: null,
      info: {},
      genres: dedupGenres,
      episodes,
      episodeList: episodes,
      id: slug,
      slug,
      source: 'animesail',
    };
  } catch (error) {
    if (!/challenge page/i.test(String(error?.message || ''))) {
      throw error;
    }

    return {
      title: '',
      poster: null,
      synopsis: '',
      rating: 'N/A',
      batch_link: null,
      info: {},
      genres: [],
      episodes: [],
      episodeList: [],
      id: slug,
      slug,
      source: 'animesail',
    };
  }
}

async function getEpisode(slug) {
  try {
    const html = await get(`/${slug}/`);
    const $ = cheerio.load(html);
    const title = $('h1.entry-title,h1').first().text().trim() || slug;
    const synopsis = $('.entry-content, .desc, .sinopsis').first().text().replace(/\s+/g, ' ').trim() || '';
    const genres = [];
    $('a[href*="/genres/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const name = $(el).text().trim();
      const genreSlug = slugFromUrl(href);
      if (name && genreSlug) genres.push({ name, slug: genreSlug });
    });
    const streams = [];
    $('iframe').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (!src) return;
      streams.push({ name: `Stream ${streams.length + 1}`, url: src });
    });
    const downloads = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const name = $(el).text().trim();
      if (!href || href === '#') return;
      if (!/drive|pixeldrain|krakenfiles|mega|mediafire|download/i.test(href)) return;
      downloads.push({ name: name || `Download ${downloads.length + 1}`, url: href });
    });

    return {
      title,
      date: '',
      synopsis,
      genres,
      navigation: {
        prev_slug: null,
        next_slug: null,
        all_episodes_slug: null,
      },
      streams,
      downloads,
      id: slug,
      slug,
      source: 'animesail',
    };
  } catch (error) {
    if (!/challenge page/i.test(String(error?.message || ''))) {
      throw error;
    }

    return {
      title: '',
      date: '',
      synopsis: '',
      genres: [],
      navigation: {
        prev_slug: null,
        next_slug: null,
        all_episodes_slug: null,
      },
      streams: [],
      downloads: [],
      id: slug,
      slug,
      source: 'animesail',
    };
  }
}

module.exports = {
  getHome,
  getTerbaru,
  getDonghua,
  getMovies,
  getSchedule,
  getList,
  search,
  getAllGenres,
  getByGenre,
  getBySeason,
  getByStudio,
  getDetail,
  getEpisode,
};
