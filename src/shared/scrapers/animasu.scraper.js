'use strict';

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://v1.animasu.app';
const FALLBACK_BASE_URLS = [
  DEFAULT_BASE_URL,
  'https://animasu.app',
];

const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.ANIMASU_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fromSingle = process.env.ANIMASU_BASE_URL ? [process.env.ANIMASU_BASE_URL.trim()] : [];
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
  const cacheKey = `animasu:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}`;

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

    throw lastError || new Error(`Failed to fetch animasu path ${path}`);
  });
}

function parseCard($, el) {
  const $el = $(el);
  const anchor = $el.is('a') ? $el : $el.find('a[href]').first();
  const href = anchor.attr('href') || '';
  if (!href) return null;

  const slug = slugFromUrl(href);
  if (!slug) return null;

  const text = anchor.text().replace(/\s+/g, ' ').trim();
  const title = (
    $el.find('.tt').first().text().trim() ||
    anchor.attr('title')?.replace(/^Nonton Anime\s+/i, '').trim() ||
    text
  );
  const poster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  const episode = $el.find('.epx').first().text().trim() || null;
  const status_or_day = $el.find('.sb').first().text().trim() || null;
  const type = $el.find('.typez').first().text().trim() || null;

  return {
    title,
    slug,
    poster,
    episode,
    status_or_day,
    type,
    url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    href: `/animasu/detail/${slug}`,
    source: 'animasu',
    id: slug,
  };
}

function parseListingPage(html, { currentPage = 1 } = {}) {
  const $ = cheerio.load(html);
  const items = [];
  const seen = new Set();

  $('.bsx, article.bs, .listupd article.bs').each((_, el) => {
    const card = parseCard($, el);
    if (!card || seen.has(card.slug)) return;
    seen.add(card.slug);
    items.push(card);
  });

  if (!items.length) {
    $('a[href*="/anime/"]').each((_, a) => {
      const href = $(a).attr('href') || '';
      if (!href.includes('/anime/')) return;
      const container = $(a).closest('.bsx, article, li, .post, .entry, .item');
      const card = parseCard($, container.length ? container : a);
      if (!card || seen.has(card.slug)) return;
      seen.add(card.slug);
      items.push(card);
    });
  }

  const pageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPageText = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)').last().text().trim();
  const parsedCurrentPage = Number.parseInt(pageText, 10) || currentPage;
  const totalPages = Number.parseInt(lastPageText, 10) || parsedCurrentPage;

  return {
    items,
    pagination: {
      hasNext: parsedCurrentPage < totalPages,
      hasPrev: parsedCurrentPage > 1,
      currentPage: parsedCurrentPage,
    },
    currentPage: parsedCurrentPage,
    totalPages,
  };
}

function parseSchedule(html) {
  const $ = cheerio.load(html);
  const anime_list = [];
  const seen = new Set();

  $('.bsx, article.bs, .listupd article.bs').each((_, el) => {
    const card = parseCard($, el);
    if (!card || seen.has(card.slug)) return;
    seen.add(card.slug);
    anime_list.push(card);
  });

  return { anime_list };
}

function parseGenresPage(html) {
  const $ = cheerio.load(html);
  const genres = [];
  const seen = new Set();

  $('a[href*="/genre/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (!href || !name || /^\d+$/.test(name)) return;
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    genres.push({ name, slug });
  });

  return { genres };
}

function parseCharactersPage(html) {
  const $ = cheerio.load(html);
  const characters = [];
  const seen = new Set();

  $('a[href*="/character/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (!href || !name || /^\d+$/.test(name)) return;
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    characters.push({ name, slug });
  });

  return { characters };
}

function parseDetailPage(html, slug) {
  const $ = cheerio.load(html);
  const detail = {
    title: $('h1.entry-title,h1').first().text().trim() || slug,
    synonym: null,
    poster: $('.thumb img, .bigcontent img, .post-thumb img').first().attr('src') || null,
    rating: $('.num, .rating-prc, .numscore').first().text().replace(/[^0-9.AN\/]/gi, '').trim() || 'N/A',
    synopsis: $('.entry-content, .desc, .sinopsis, .content').first().text().replace(/\s+/g, ' ').trim() || null,
    trailer: $('iframe[src*="youtube"], iframe[src*="youtu.be"]').first().attr('src') || null,
    genres: [],
    status: null,
    aired: null,
    type: null,
    duration: null,
    author: null,
    studio: null,
    season: null,
    episodes: [],
  };

  $('.info p, .spe span').each((_, el) => {
    const key = $(el).find('b').first().text().replace(':', '').trim().toLowerCase();
    const value = $(el).clone().children('b').remove().end().text().trim();
    if (!key || !value) return;

    if (key.includes('genre')) return;
    if (key.includes('japanese') || key.includes('synonym')) detail.synonym = value;
    else if (key.includes('status')) detail.status = value;
    else if (key.includes('aired')) detail.aired = value;
    else if (key.includes('type')) detail.type = value;
    else if (key.includes('duration')) detail.duration = value;
    else if (key.includes('author')) detail.author = value;
    else if (key.includes('studio')) detail.studio = value;
    else if (key.includes('season')) detail.season = value;
  });

  $('.info a[href*="/genre/"], a[href*="/genre/"]').each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr('href') || '';
    const genreSlug = slugFromUrl(href);
    if (name && genreSlug) detail.genres.push({ name, slug: genreSlug });
  });
  detail.genres = [...new Map(detail.genres.map((genre) => [genre.slug, genre])).values()];

  const episodeMap = new Map();
  $('a[href*="/nonton-"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    const episodeSlug = slugFromUrl(href);
    if (!href || !episodeSlug || !/^Episode\s+/i.test(name)) return;
    if (!episodeMap.has(episodeSlug)) {
      episodeMap.set(episodeSlug, { name, slug: episodeSlug });
    }
  });
  detail.episodes = Array.from(episodeMap.values());

  return {
    title: detail.title,
    synonym: detail.synonym,
    poster: detail.poster,
    rating: detail.rating,
    synopsis: detail.synopsis,
    trailer: detail.trailer,
    genres: detail.genres,
    status: detail.status,
    aired: detail.aired,
    type: detail.type,
    duration: detail.duration,
    author: detail.author,
    studio: detail.studio,
    season: detail.season,
    episodes: detail.episodes,
    episodeList: detail.episodes,
    id: slug,
    slug,
    source: 'animasu',
  };
}

function parseEpisodePage(html, slug) {
  const $ = cheerio.load(html);
  const title = $('h1.entry-title,h1').first().text().trim() || slug;

  const streams = [];
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (!src) return;
    if (/facebook\.com\/plugins\/like|cbox\.ws/i.test(src)) return;
    streams.push({ name: `Stream ${streams.length + 1}`, url: src });
  });

  const downloads = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (!href || href === '#') return;
    if (!/blogger\.com\/video|yourupload|vidhide|mega\.nz|filedon|pixeldrain|mediafire|gofile|mp4|m3u8/i.test(href)) return;
    downloads.push({ name: name || `Download ${downloads.length + 1}`, url: href });
  });

  return {
    title,
    streams,
    downloads,
    id: slug,
    slug,
    source: 'animasu',
  };
}

async function getHome({ page = 1 } = {}) {
  const html = await get(page > 1 ? `/page/${page}/` : '/');
  const parsed = parseListingPage(html, { currentPage: page });
  const ongoing = parsed.items.filter((item) => /🔥|Episode/i.test(item.episode || '')).slice(0, 10);
  const recent = parsed.items.filter((item) => /Selesai|Movie|Completed/i.test(`${item.status_or_day || ''} ${item.episode || ''}`)).slice(0, 10);
  return {
    ongoing,
    recent,
    pagination: parsed.pagination,
  };
}

async function getPopular({ page = 1 } = {}) {
  const html = await get(page > 1 ? `/populer/page/${page}/` : '/populer/');
  const parsed = parseListingPage(html, { currentPage: page });
  return { anime_list: parsed.items, animeList: parsed.items, pagination: parsed.pagination };
}

async function getMovies({ page = 1 } = {}) {
  const html = await get(page > 1 ? `/anime-movie/page/${page}/` : '/anime-movie/');
  const parsed = parseListingPage(html, { currentPage: page });
  return { anime_list: parsed.items, animeList: parsed.items, pagination: parsed.pagination };
}

async function getOngoing({ page = 1 } = {}) {
  const home = await getHome({ page });
  return { anime_list: home.ongoing, animeList: home.ongoing, pagination: home.pagination };
}

async function getCompleted({ page = 1 } = {}) {
  const home = await getHome({ page });
  return { anime_list: home.recent, animeList: home.recent, pagination: home.pagination };
}

async function getLatest({ page = 1 } = {}) {
  const html = await get(page > 1 ? `/page/${page}/` : '/');
  const parsed = parseListingPage(html, { currentPage: page });
  return { anime_list: parsed.items, animeList: parsed.items, pagination: parsed.pagination };
}

async function search(keyword, { page = 1 } = {}) {
  const q = String(keyword || '').trim();
  if (!q) return { anime_list: [], animeList: [], pagination: { hasNext: false, hasPrev: false, currentPage: page } };
  const html = await get('/', { s: q, page: page > 1 ? page : undefined });
  const parsed = parseListingPage(html, { currentPage: page });
  return { anime_list: parsed.items, animeList: parsed.items, pagination: parsed.pagination };
}

async function getAnimeList({ letter, page = 1 } = {}) {
  const q = letter ? String(letter).trim().toLowerCase() : '';
  const searchResult = q ? await search(q, { page }) : await getLatest({ page });
  const filtered = q
    ? (searchResult.anime_list || []).filter((item) => item.title?.trim()?.toLowerCase()?.startsWith(q))
    : (searchResult.anime_list || []);

  return {
    anime_list: filtered,
    animeList: filtered,
    pagination: searchResult.pagination,
  };
}

async function advancedSearch(params = {}) {
  const { genres, status, page = 1 } = params;
  let items = (await getLatest({ page })).anime_list || [];
  if (genres) {
    const genreResult = await getByGenre(String(genres).split(',')[0], { page });
    items = genreResult.anime_list || [];
  }
  if (status) {
    const statusNeedle = status === 'completed' ? /selesai|completed|movie/i : /episode|🔥|ongoing/i;
    items = items.filter((item) => statusNeedle.test(`${item.status_or_day || ''} ${item.episode || ''}`));
  }
  return { anime_list: items, animeList: items, pagination: { hasNext: false, hasPrev: page > 1, currentPage: page } };
}

async function getAllGenres() {
  const html = await get('/kumpulan-genre-anime-lengkap/');
  return parseGenresPage(html);
}

async function getByGenre(slug, { page = 1 } = {}) {
  const html = await get(page > 1 ? `/genre/${slug}/page/${page}/` : `/genre/${slug}/`);
  const parsed = parseListingPage(html, { currentPage: page });
  return { anime_list: parsed.items, animeList: parsed.items, pagination: parsed.pagination };
}

async function getCharacters() {
  try {
    const html = await get('/character/');
    return parseCharactersPage(html);
  } catch {
    return { characters: [] };
  }
}

async function getByCharacter(slug, { page = 1 } = {}) {
  try {
    const html = await get(page > 1 ? `/character/${slug}/page/${page}/` : `/character/${slug}/`);
    const parsed = parseListingPage(html, { currentPage: page });
    return { anime_list: parsed.items, animeList: parsed.items, pagination: parsed.pagination };
  } catch {
    return { anime_list: [], animeList: [], pagination: { hasNext: false, hasPrev: page > 1, currentPage: page } };
  }
}

async function getSchedule() {
  const html = await get('/jadwal/');
  return parseSchedule(html);
}

async function getDetail(slug) {
  const html = await get(`/anime/${slug}/`);
  return parseDetailPage(html, slug);
}

async function getEpisode(slug) {
  const html = await get(`/${slug}/`);
  return parseEpisodePage(html, slug);
}

module.exports = {
  getHome,
  getPopular,
  getMovies,
  getOngoing,
  getCompleted,
  getLatest,
  search,
  getAnimeList,
  advancedSearch,
  getAllGenres,
  getByGenre,
  getCharacters,
  getByCharacter,
  getSchedule,
  getDetail,
  getEpisode,
};
