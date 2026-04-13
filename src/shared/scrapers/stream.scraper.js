'use strict';

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const BASE_URL = process.env.STREAM_BASE_URL || 'https://anime-indo.lol';
const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function resolveUrl(url = '') {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

function slugFromUrl(url = '') {
  if (!url) return '';
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url;
    return pathname.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
  } catch {
    return url.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';
  }
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeImage(url = '') {
  if (!url) return '';
  return resolveUrl(url);
}

function wrapBase(payload) {
  return {
    status: 200,
    creator: 'Sanka Vollerei',
    ...payload,
  };
}

async function get(path, { cacheTtlMs = CACHE_TTL_MS } = {}) {
  const cacheKey = `stream:${path}`;
  return remember(cacheKey, cacheTtlMs, async () => {
    const url = `${BASE_URL}${path}`;
    return playwrightGet(url);
  });
}

function parseLatestCards(html) {
  const $ = cheerio.load(html);
  const data = [];
  const seen = new Set();

  $('.menu a[href*="-episode-"] .list-anime').each((_, node) => {
    const card = $(node);
    const anchor = card.parent('a');
    const href = anchor.attr('href') || '';
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    data.push({
      title: normalizeText(card.find('p').first().text()) || normalizeText(card.find('img').attr('alt')) || slug,
      slug,
      poster: normalizeImage(card.find('img').attr('data-original') || card.find('img').attr('src') || ''),
      episode: normalizeText(card.find('.eps').first().text()) || '',
    });
  });

  return data;
}

function parsePopularCards(html) {
  const $ = cheerio.load(html);
  const data = [];
  const seen = new Set();

  $('.nganan table.ztable').each((_, node) => {
    const table = $(node);
    const anchor = table.find('.zvidesc a[href*="/anime/"]').first();
    const href = anchor.attr('href') || '';
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const title = normalizeText(anchor.text()) || normalizeText(table.find('img').attr('alt')) || slug;
    const poster = normalizeImage(table.find('img').first().attr('src') || table.find('img').first().attr('data-original') || '');
    const rawGenreText = normalizeText(table.find('.zvidesc').text()).replace(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\s*`), '');
    const genres = rawGenreText
      .split(',')
      .map((value) => normalizeText(value))
      .filter((g) => g.length > 0 && g.length <= 30 && /^[A-Za-z\s\-]+$/.test(g));

    data.push({ title, poster, slug, genres });
  });

  return data;
}

function parseTableCards(html) {
  const $ = cheerio.load(html);
  const data = [];
  const seen = new Set();

  $('table.otable').each((_, node) => {
    const table = $(node);
    const anchor = table.find('.videsc > a[href*="/anime/"]').first();
    const href = anchor.attr('href') || '';
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    const labels = table.find('.label').map((__, el) => normalizeText($(el).text())).get().filter(Boolean);

    data.push({
      title: normalizeText(anchor.text()) || slug,
      poster: normalizeImage(table.find('img').first().attr('src') || table.find('img').first().attr('data-original') || ''),
      slug,
      synopsis: normalizeText(table.find('.des').first().text()),
      type: labels[0] || '',
      status: labels[1] || '',
      year: labels[2] || '',
    });
  });

  return data;
}

function parseEpisodeSlugText(raw = '') {
  const compact = normalizeText(raw);
  if (!compact) return '';
  if (/^episode\s+/i.test(compact)) return compact;
  return `Episode  ${compact}`;
}

async function getLatest(page = 1) {
  const pageNumber = Number.parseInt(page, 10) || 1;
  const path = pageNumber > 1 ? `/page/${pageNumber}/` : '/';
  const html = await get(path);
  return wrapBase({ page: pageNumber, data: parseLatestCards(html) });
}

async function getPopular() {
  const html = await get('/');
  return wrapBase({ data: parsePopularCards(html) });
}

async function search(query) {
  const q = normalizeText(query);
  if (!q) return wrapBase({ page: 1, data: [] });

  const html = await get(`/?s=${encodeURIComponent(q)}`);
  const fromTables = parseTableCards(html);
  if (fromTables.length > 0) return wrapBase({ page: 1, data: fromTables });

  const fromLatestCards = parseLatestCards(html).map((item) => ({
    title: item.title,
    poster: item.poster,
    slug: item.slug.replace(/-episode-\d+.*$/i, ''),
  }));

  return wrapBase({ page: 1, data: fromLatestCards });
}

async function getAnime(slug) {
  const html = await get(`/anime/${slug}/`);
  const $ = cheerio.load(html);

  const title = normalizeText($('h1').first().text()) || slug;
  const poster = normalizeImage($('.detail img').first().attr('src') || $('.detail img').first().attr('data-original') || '');
  const synopsis = normalizeText($('.detail p').first().text());

  const genres = [];
  $('.detail a[href*="/genres/"]').each((_, el) => {
    const name = normalizeText($(el).text());
    if (name) genres.push(name);
  });

  const genreUnique = [...new Set(genres)];
  const episodes = [];
  const seenEpisode = new Set();
  $('a[href*="-episode-"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const epsSlug = slugFromUrl(href);
    if (!epsSlug || seenEpisode.has(epsSlug)) return;
    seenEpisode.add(epsSlug);

    const epsText = parseEpisodeSlugText($(el).text());
    episodes.push({
      eps_title: epsText || epsSlug,
      eps_slug: epsSlug,
    });
  });

  return wrapBase({
    data: {
      title,
      poster,
      synopsis,
      genres: genreUnique,
      episodes,
    },
  });
}

function shouldIncludeDownload({ text, href }) {
  const normalizedHref = (href || '').toLowerCase();
  const normalizedText = (text || '').toLowerCase();
  if (!normalizedHref || normalizedHref === '#' || normalizedHref.endsWith('/#')) return false;
  if (normalizedText.startsWith('download')) return true;
  if (normalizedHref.includes('/download.php')) return true;
  if (/mp4upload\.com\/[a-z0-9]+\.html/i.test(normalizedHref)) return true;
  if (/mediafire|mega\.nz|krakenfiles|pixeldrain|yourupload/i.test(normalizedHref)) return true;
  return false;
}

async function getEpisode(slug) {
  const html = await get(`/${slug}/`);
  const $ = cheerio.load(html);

  const title = normalizeText($('h1').first().text()) || slug;
  const poster = normalizeImage($('.detail img').first().attr('src') || $('.detail img').first().attr('data-original') || '');
  const synopsis = normalizeText($('.detail p').first().text());

  const stream_links = [];
  const seenStreams = new Set();
  $('a.server').each((_, el) => {
    const server = normalizeText($(el).text());
    const url = resolveUrl($(el).attr('data-video') || $(el).attr('href') || '');
    if (!server || !url || url.endsWith('/#') || seenStreams.has(`${server}:${url}`)) return;
    seenStreams.add(`${server}:${url}`);
    stream_links.push({ server, url });
  });

  if (stream_links.length === 0) {
    $('iframe').each((_, el) => {
      const url = resolveUrl($(el).attr('src') || $(el).attr('data-src') || '');
      if (!url || url.endsWith('javascript:false') || seenStreams.has(url)) return;
      seenStreams.add(url);
      stream_links.push({ server: `Server ${stream_links.length + 1}`, url });
    });
  }

  const download_links = [];
  const seenDownloads = new Set();
  $('a[href]').each((_, el) => {
    const href = resolveUrl($(el).attr('href') || '');
    const server = normalizeText($(el).text()) || `Download ${download_links.length + 1}`;
    if (!shouldIncludeDownload({ text: server, href })) return;
    if (seenDownloads.has(href)) return;
    seenDownloads.add(href);
    download_links.push({ server, url: href });
  });

  let prev_slug = null;
  let next_slug = null;
  $('.nav a[href], .navi a[href]').each((_, el) => {
    const text = normalizeText($(el).text()).toLowerCase();
    const href = $(el).attr('href') || '';
    const navSlug = slugFromUrl(href);
    if (!navSlug) return;
    if (text.includes('prev')) prev_slug = navSlug;
    if (text.includes('next')) next_slug = navSlug;
  });

  return wrapBase({
    data: {
      title,
      poster,
      synopsis,
      stream_links,
      download_links,
      next_slug,
      prev_slug,
    },
  });
}

async function getMovies(page = 1) {
  const pageNumber = Number.parseInt(page, 10) || 1;
  const path = pageNumber > 1 ? `/movie/page/${pageNumber}/` : '/movie/';
  const html = await get(path);
  const data = parseTableCards(html).map((item) => ({
    title: item.title,
    poster: item.poster,
    slug: item.slug,
    synopsis: item.synopsis,
  }));
  return wrapBase({ page: String(pageNumber), data });
}

async function getList() {
  const html = await get('/anime-list/');
  const $ = cheerio.load(html);
  const seen = new Set();
  const data = [];

  $('.anime-list a[href*="/anime/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const slug = slugFromUrl(href);
    const title = normalizeText($(el).text());
    if (!slug || !title || seen.has(slug)) return;
    seen.add(slug);
    data.push({ title, slug });
  });

  return wrapBase({ total: data.length, data });
}

async function getGenres() {
  const html = await get('/list-genre/');
  const $ = cheerio.load(html);
  const seen = new Set();
  const data = [];

  $('.list-genre a[href*="/genres/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const slug = slugFromUrl(href);
    const title = normalizeText($(el).text());
    if (!slug || !title || seen.has(slug)) return;
    seen.add(slug);
    data.push({ title, slug });
  });

  return wrapBase({ data });
}

async function getByGenre(slug, page = 1) {
  const pageNumber = Number.parseInt(page, 10) || 1;
  const path = pageNumber > 1 ? `/genres/${slug}/page/${pageNumber}/` : `/genres/${slug}/`;
  const html = await get(path);
  const data = parseTableCards(html).map((item) => ({
    title: item.title,
    poster: item.poster,
    slug: item.slug,
    type: item.type,
    status: item.status,
  }));

  return wrapBase({
    genre: slug,
    page: String(pageNumber),
    data,
  });
}

module.exports = {
  getLatest,
  getPopular,
  search,
  getAnime,
  getEpisode,
  getMovies,
  getList,
  getGenres,
  getByGenre,
};
