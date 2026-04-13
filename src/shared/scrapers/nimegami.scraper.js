'use strict';

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://nimegami.id';
const FALLBACK_BASE_URLS = [DEFAULT_BASE_URL, 'https://nimegami.com'];
const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);
const NIMEGAMI_CREATOR = 'Sanka Vollerei';

function parseBaseUrls() {
  const fromList = (process.env.NIMEGAMI_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fromSingle = process.env.NIMEGAMI_BASE_URL ? [process.env.NIMEGAMI_BASE_URL.trim()] : [];
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
  const cacheKey = `nimegami:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}`;

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

    throw lastError || new Error(`Failed to fetch nimegami path ${path}`);
  });
}

function wrap(payload) {
  return {
    status: 'success',
    creator: NIMEGAMI_CREATOR,
    source: 'Nimegami',
    ...payload,
  };
}

function parseArchiveCard($, articleEl) {
  const $article = $(articleEl);
  const titleAnchor = $article.find('h1 a[href], h2 a[href], a[href*="sub-indo"]').first();
  const href = titleAnchor.attr('href') || '';
  const slug = slugFromUrl(href);
  if (!href || !slug) return null;

  const title = titleAnchor.text().replace(/\s+/g, ' ').trim() || $article.find('img').first().attr('alt') || slug;
  const poster = $article.find('img').first().attr('src') || $article.find('img').first().attr('data-src') || '';
  const type = $article.find('a[href*="/type/"]').first().text().replace(/\s+/g, ' ').trim() || null;
  const status = $article.find('a[href*="/tag/on-going"], a[href*="/tag/complete"], a[href*="/tag/completed"]').first().text().replace(/\s+/g, ' ').trim() || null;

  const episodeMatch = $article.text().match(/Ep\.?\s*(\d+)/i) || title.match(/Episode\s*(\d+)/i);
  const episode = episodeMatch ? episodeMatch[1] : null;

  return {
    title,
    slug,
    poster,
    type,
    episode,
    status,
    nimegami_url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
  };
}

function parseArchivePage(html, { currentPage = 1 } = {}) {
  const $ = cheerio.load(html);
  const anime_list = [];
  const seen = new Set();

  $('article').each((_, articleEl) => {
    const card = parseArchiveCard($, articleEl);
    if (!card || seen.has(card.slug)) return;
    seen.add(card.slug);
    anime_list.push(card);
  });

  if (!anime_list.length) {
    $('a[href*="sub-indo"], a[href*="/drama/"]').each((_, anchor) => {
      const href = $(anchor).attr('href') || '';
      const slug = slugFromUrl(href);
      if (!href || !slug || seen.has(slug)) return;
      seen.add(slug);
      anime_list.push({
        title: $(anchor).text().replace(/\s+/g, ' ').trim() || slug,
        slug,
        poster: '',
        type: null,
        episode: null,
        status: null,
        nimegami_url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
      });
    });
  }

  const pageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const parsedCurrentPage = Number.parseInt(pageText, 10) || currentPage;
  const hasNext = $('.pagination .next, .pagination .next.page-numbers, a.next').length > 0;

  return {
    anime_list,
    animeList: anime_list,
    pagination: {
      hasNext,
      hasPrev: parsedCurrentPage > 1,
      currentPage: parsedCurrentPage,
    },
  };
}

function parsePropertyList(html, hrefPattern) {
  const $ = cheerio.load(html);
  const properties = [];
  const seen = new Set();

  $(`a[href*="${hrefPattern}"]`).each((_, anchor) => {
    const href = $(anchor).attr('href') || '';
    const slug = slugFromUrl(href);
    const name = $(anchor).text().replace(/\s+/g, ' ').trim().replace(/\(\d+\)$/, '').trim();
    if (!href || !slug || !name || seen.has(slug)) return;
    seen.add(slug);
    properties.push({
      name,
      slug,
      url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    });
  });

  return { properties };
}

function parseDownloadLinks($) {
  const download_links = [];
  const seen = new Set();

  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const text = $(a).text().replace(/\s+/g, ' ').trim();
    if (!href || href === '#') return;

    if (!/^https?:\/\//i.test(href)) return;

    let host = '';
    try {
      host = new URL(href).hostname;
    } catch {
      return;
    }

    if (/nimegami\.id|nimegami\.com|drama-id\.com|berkasdrive\.com\/?$/i.test(host)) return;

    const isDownloadLike = /go\.berkasdrive\.com|files\.im|mitedrive|terabox|mega4upload|frdl\.io|pixeldrain|mediafire|gofile|krakenfiles|mega\.nz|drive\.google/i.test(href);
    if (!isDownloadLike) return;

    const episodeTitle = detectEpisodeLabel($, a) || $('h1').first().text().replace(/\s+/g, ' ').trim() || 'Episode 1';
    const resolution = text.match(/(360p|480p|720p|1080p)/i)?.[1] || '';
    const key = `${episodeTitle}|${host}|${resolution}|${href}`;
    if (seen.has(key)) return;
    seen.add(key);

    download_links.push({
      episode_title: episodeTitle,
      host,
      resolution,
      url: href,
    });
  });

  return download_links;
}

function extractInfoTable($) {
  const info = {};
  $('table tr').each((_, row) => {
    const key = $(row).find('th, td').first().text().replace(/\s+/g, ' ').trim().replace(/:+$/, '').toLowerCase();
    const value = $(row).find('td').last().text().replace(/\s+/g, ' ').trim();
    if (!key || !value || key === value.toLowerCase()) return;
    info[key.replace(/[^a-z0-9]+/g, '_')] = value;
  });
  return info;
}

function detectEpisodeLabel($, anchor) {
  const localText = $(anchor).closest('p,li,div,td').text().replace(/\s+/g, ' ').trim();
  const localMatch = localText.match(/Episode\s*\d+/i);
  if (localMatch) return localMatch[0].replace(/\s+/g, ' ').trim();

  const prevText = $(anchor).parents().eq(0).prevAll('h1,h2,h3,h4,h5,strong,b,p').first().text().replace(/\s+/g, ' ').trim();
  const prevMatch = prevText.match(/Episode\s*\d+/i);
  if (prevMatch) return prevMatch[0].replace(/\s+/g, ' ').trim();

  return null;
}

function parseDetailPage(html, slug) {
  const $ = cheerio.load(html);

  const detail = {
    poster: $('article img').first().attr('src') || $('article img').first().attr('data-src') || '',
    title: $('h1').first().text().replace(/\s+/g, ' ').trim(),
    synopsis: $('article p').first().text().replace(/\s+/g, ' ').trim(),
    info: extractInfoTable($),
    genres: [],
  };

  const seenGenre = new Set();
  $('a[href*="/category/"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const name = $(a).text().replace(/\s+/g, ' ').trim();
    const genreSlug = slugFromUrl(href);
    if (!href || !name || !genreSlug || seenGenre.has(genreSlug)) return;
    seenGenre.add(genreSlug);
    detail.genres.push({
      name,
      slug: genreSlug,
      url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    });
  });

  const streamsByEpisode = {};
  $('a[href*="go.berkasdrive.com"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const name = $(a).text().replace(/\s+/g, ' ').trim();
    if (!href || !name) return;

    const episode = detectEpisodeLabel($, a) || 'Episode 1';
    if (!streamsByEpisode[episode]) streamsByEpisode[episode] = [];
    const resolution = name.match(/(360p|480p|720p|1080p)/i)?.[1] || null;
    streamsByEpisode[episode].push({ name, resolution, url: href });
  });

  detail.download_links = parseDownloadLinks($);

  return wrap({
    detail,
    streams_by_episode: streamsByEpisode,
    slug,
  });
}

async function getHome({ page = 1 } = {}) {
  const path = page > 1 ? `/anime-terbaru-sub-indo/page/${page}/` : '/anime-terbaru-sub-indo/';
  return wrap(parseArchivePage(await get(path), { currentPage: page }));
}

async function search(query, { page = 1 } = {}) {
  const q = String(query || '').trim();
  if (!q) {
    return wrap({ anime_list: [], animeList: [], pagination: { hasNext: false, hasPrev: false, currentPage: page } });
  }
  const path = page > 1 ? `/page/${page}/` : '/';
  return wrap(parseArchivePage(await get(path, { s: q }), { currentPage: page }));
}

async function getDetail(slug) {
  return parseDetailPage(await get(`/${slug}/`), slug);
}

async function getAnimeList({ page = 1 } = {}) {
  // Nimegami anime-list adalah satu halaman besar tanpa pagination efektif.
  const html = await get('/anime-list/');
  const $ = cheerio.load(html);
  const anime_list = [];
  const seen = new Set();

  $('a[href*="sub-indo"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const slug = slugFromUrl(href);
    const title = $(a).text().replace(/\s+/g, ' ').trim();
    if (!href || !slug || !title || seen.has(slug)) return;
    seen.add(slug);

    const metaMatch = title.match(/\(([^)]+)\)$/);
    anime_list.push({
      title: title.replace(/\s*\([^)]*\)\s*$/, '').trim(),
      slug,
      poster: '',
      type: null,
      episode: null,
      status: metaMatch ? metaMatch[1] : null,
      nimegami_url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    });
  });

  return wrap({
    anime_list,
    animeList: anime_list,
    pagination: {
      hasNext: false,
      hasPrev: false,
      currentPage: page,
    },
  });
}

async function getGenreList() {
  return wrap(parsePropertyList(await get('/genre-category-list/'), '/category/'));
}

async function getByGenre(slug) {
  return wrap(parseArchivePage(await get(`/category/${slug}/`)));
}

async function getSeasonList() {
  return wrap(parsePropertyList(await get('/seasons-musim-list/'), '/seasons/'));
}

async function getBySeason(slug) {
  return wrap(parseArchivePage(await get(`/seasons/${slug}/`)));
}

async function getTypeList() {
  return wrap(parsePropertyList(await get('/type-list/'), '/type/'));
}

async function getByType(slug) {
  return wrap(parseArchivePage(await get(`/type/${slug}/`)));
}

async function getJDrama() {
  return wrap(parseArchivePage(await get('/drama-jepang-list/')));
}

async function getLiveAction() {
  return wrap(parseArchivePage(await get('/live-action-list/')));
}

async function getLiveDetail(slug) {
  return parseDetailPage(await get(`/live-action/${slug}/`), slug);
}

async function getDrama(slug) {
  return parseDetailPage(await get(`/drama/${slug}/`), slug);
}

module.exports = {
  getHome,
  search,
  getDetail,
  getAnimeList,
  getGenreList,
  getByGenre,
  getSeasonList,
  getBySeason,
  getTypeList,
  getByType,
  getJDrama,
  getLiveAction,
  getLiveDetail,
  getDrama,
};
