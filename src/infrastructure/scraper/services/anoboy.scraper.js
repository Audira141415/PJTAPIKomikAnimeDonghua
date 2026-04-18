'use strict';

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://anoboy.be';
const FALLBACK_BASE_URLS = [
  DEFAULT_BASE_URL,
  'https://anoboy.show',
];

const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.ANOBOY_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const fromSingle = process.env.ANOBOY_BASE_URL ? [process.env.ANOBOY_BASE_URL.trim()] : [];
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

const pathFromUrl = (url = '') => {
  try {
    return url.startsWith('http') ? new URL(url).pathname : url;
  } catch {
    return url;
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
  const cacheKey = `anoboy:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}`;

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

    throw lastError || new Error(`Failed to fetch anoboy path ${path}`);
  });
}

function normalizeAnimeItem(item) {
  if (!item) return null;

  const hasAnimeId = Object.prototype.hasOwnProperty.call(item, 'animeId');
  const animeId = hasAnimeId ? item.animeId : (item?.slug || item?.id || null);
  return {
    ...item,
    source: 'anoboy',
    id: item?.id || item?.slug || animeId || null,
    animeId: animeId ?? null,
    slug: item?.slug || animeId || null,
  };
}

function normalizeEpisodeItem(item) {
  if (!item) return null;

  const episodeId = item?.episodeId || item?.episodeSlug || item?.slug || item?.id || null;
  return {
    ...item,
    source: 'anoboy',
    id: episodeId,
    episodeId,
    episodeSlug: episodeId,
    slug: episodeId,
  };
}

function parseCard($, el) {
  const $el = $(el);
  const a = $el.find('a[href]').first();
  const href = a.attr('href') || '';
  if (!href) return null;

  const title = (
    a.attr('title') ||
    $el.find('.tt h2, h2[itemprop="headline"], .tt').first().text().trim() ||
    a.text().trim()
  );

  const poster = (
    $el.find('img').first().attr('src') ||
    $el.find('img').first().attr('data-src') ||
    ''
  );

  const episode = $el.find('.epx, .epxs, .ep').first().text().trim() || null;
  const type = $el.find('.typez').first().text().trim() || null;
  const status = $el.find('.status, .tlndn').first().text().trim() || null;

  const urlPath = pathFromUrl(href);
  const isAnimeDetail = /\/anime\//i.test(urlPath);
  const slug = slugFromUrl(href);
  if (!slug) return null;

  return {
    title,
    poster,
    episode,
    type,
    status,
    url: href.startsWith('http') ? href : `${getBaseUrl()}${urlPath}`,
    href: isAnimeDetail ? `/anoboy/anime/${slug}` : `/anoboy/episode/${slug}`,
    animeId: isAnimeDetail ? slug : null,
    id: slug,
    slug,
  };
}

function parseListingPage(html, { currentPage = 1 } = {}) {
  const $ = cheerio.load(html);
  const animeList = [];
  const seen = new Set();

  $('.listupd article.bs, article.bs').each((_, el) => {
    const item = parseCard($, el);
    if (!item || seen.has(item.slug)) return;
    seen.add(item.slug);
    animeList.push(item);
  });

  const pageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPageText = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)')
    .last().text().trim();
  const parsedCurrentPage = Number.parseInt(pageText, 10) || currentPage;
  const totalPages = Number.parseInt(lastPageText, 10) || parsedCurrentPage;
  const pagination = {
    hasNext: parsedCurrentPage < totalPages,
    hasPrev: parsedCurrentPage > 1,
    currentPage: parsedCurrentPage,
  };

  return {
    anime_list: animeList,
    animeList,
    pagination,
    currentPage: parsedCurrentPage,
    totalPages,
  };
}

function parseAnimeDetail(html, slug) {
  const $ = cheerio.load(html);

  const getSpe = (key) => {
    let value = '';
    $('.spe span').each((_, el) => {
      const label = $(el).find('b').first().text().replace(':', '').trim().toLowerCase();
      if (label === key.toLowerCase()) {
        value = $(el).clone().children('b').remove().end().text().trim();
        return false;
      }
      return undefined;
    });
    return value;
  };

  const title = $('h1.entry-title, h1').first().text().trim() || slug;
  const poster = (
    $('.thumb img, .bigcontent img').first().attr('src') ||
    $('.thumb img, .bigcontent img').first().attr('data-src') ||
    null
  );

  const genres = [];
  $('.genxed a, .genres a').each((_, el) => {
    const genreTitle = $(el).text().trim();
    const genreUrl = $(el).attr('href') || '';
    const genreSlug = slugFromUrl(genreUrl);
    if (genreTitle && genreSlug) {
      genres.push({
        title: genreTitle,
        genreId: genreSlug,
        href: `/anoboy/genre/${genreSlug}`,
        url: genreUrl.startsWith('http') ? genreUrl : `${getBaseUrl()}${genreUrl}`,
      });
    }
  });

  const synopsisParts = [];
  $('.entry-content p, .synp p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) synopsisParts.push(text);
  });

  const episodeList = [];
  $('.eplister li, .episodelist li, .lstepsiode li').each((_, el) => {
    const a = $(el).find('a[href]').first();
    const epUrl = a.attr('href') || '';
    const epSlug = slugFromUrl(epUrl);
    if (!epSlug) return;

    const epTitle = a.text().trim() || $(el).find('.epl-title').text().trim() || null;
    const epDate = $(el).find('.epl-date').text().trim() || null;
    const epNum = $(el).find('.epl-num').text().trim() || null;

    episodeList.push({
      title: epTitle,
      episodeNum: epNum,
      releasedOn: epDate,
      episodeSlug: epSlug,
      id: epSlug,
      slug: epSlug,
      href: `/anoboy/episode/${epSlug}`,
      url: epUrl.startsWith('http') ? epUrl : `${getBaseUrl()}${epUrl}`,
    });
  });

  const totalEpisodesRaw = getSpe('Episodes');
  const totalEpisodes = totalEpisodesRaw ? (Number.parseInt(totalEpisodesRaw, 10) || null) : null;

  return {
    title,
    poster,
    japanese: getSpe('Japanese') || null,
    synonyms: getSpe('Synonyms') || getSpe('Synonym') || null,
    english: getSpe('English') || null,
    status: getSpe('Status') || null,
    type: getSpe('Type') || null,
    sourceType: getSpe('Source') || null,
    duration: getSpe('Duration') || null,
    season: getSpe('Season') || null,
    studios: getSpe('Studios') || getSpe('Studio') || null,
    producers: getSpe('Producers') || getSpe('Producer') || null,
    aired: getSpe('Aired') || null,
    totalEpisodes,
    score: $('.num, .rating-prc, .numscore').first().text().replace(/[^0-9.]/g, '').trim() || null,
    synopsis: synopsisParts.join('\n\n') || null,
    genres,
    genreList: genres,
    episode_list: episodeList,
    episodeList,
    id: slug,
    animeId: slug,
    slug,
    url: `${getBaseUrl()}/anime/${slug}/`,
    href: `/anoboy/anime/${slug}`,
    source: 'anoboy',
  };
}

function parseEpisodeDetail(html, slug) {
  const $ = cheerio.load(html);

  const title = $('h1.entry-title, h1').first().text().trim() || slug;
  const animeHref = $('.navimedia .nvs.nvsc a, .entry-info a[href*="/anime/"]').first().attr('href') || '';
  const animeSlug = slugFromUrl(animeHref);

  const streamCandidates = [];
  $('iframe').each((_, iframe) => {
    const src = $(iframe).attr('src') || $(iframe).attr('data-src') || '';
    if (!src || src === 'javascript:false') return;
    streamCandidates.push(src);
  });

  const prevHref = $('.naveps a[rel="prev"]').first().attr('href') || '';
  const nextHref = $('.naveps a[rel="next"]').first().attr('href') || '';

  const makeNav = (url) => {
    if (!url) return null;
    const navSlug = slugFromUrl(url);
    if (!navSlug) return null;
    return normalizeEpisodeItem({
      episodeSlug: navSlug,
      href: `/anoboy/episode/${navSlug}`,
      url: url.startsWith('http') ? url : `${getBaseUrl()}${url}`,
    });
  };

  const downloadList = [];
  $('.soraddlx .soraurlx a, .download-area a, .dllink a').each((_, el) => {
    const label = $(el).text().trim();
    const url = $(el).attr('href') || '';
    if (label && url) downloadList.push({ label, url });
  });

  const releasedOn = $('.entry-info .updated').first().text().trim() || null;

  return {
    title,
    releasedOn,
    animeSlug: animeSlug || null,
    animeId: animeSlug || null,
    episodeSlug: slug,
    episodeId: slug,
    id: slug,
    slug,
    streamingUrl: streamCandidates[0] || null,
    streamList: streamCandidates,
    defaultStreamingUrl: streamCandidates[0] || null,
    prevEpisode: makeNav(prevHref),
    nextEpisode: makeNav(nextHref),
    downloadList,
    url: `${getBaseUrl()}/${slug}/`,
    href: `/anoboy/episode/${slug}`,
    source: 'anoboy',
  };
}

async function getHome({ page = 1 } = {}) {
  const path = page > 1 ? `/page/${page}/` : '/';
  const html = await get(path);
  const payload = parseListingPage(html, { currentPage: page });
  return {
    ...payload,
    anime_list: payload.anime_list.map(normalizeAnimeItem),
    animeList: payload.animeList.map(normalizeAnimeItem),
  };
}

async function search(keyword, { page = 1 } = {}) {
  const query = String(keyword || '').trim();
  if (!query) return { anime_list: [], animeList: [], pagination: { hasNext: false, hasPrev: false, currentPage: page }, currentPage: page, totalPages: page };

  const html = await get('/', { s: query, page: page > 1 ? page : undefined });
  const payload = parseListingPage(html, { currentPage: page });
  return {
    query,
    ...payload,
    anime_list: payload.anime_list.map(normalizeAnimeItem),
    animeList: payload.animeList.map(normalizeAnimeItem),
  };
}

async function getAnime(slug) {
  const html = await get(`/anime/${slug}/`);
  const payload = parseAnimeDetail(html, slug);
  return {
    ...payload,
    episode_list: payload.episode_list.map(normalizeEpisodeItem),
    episodeList: payload.episodeList.map(normalizeEpisodeItem),
  };
}

async function getEpisode(slug) {
  const html = await get(`/${slug}/`);
  return parseEpisodeDetail(html, slug);
}

async function getAzList({ page = 1, show } = {}) {
  const html = await get('/az-list/', { show, page: page > 1 ? page : undefined });
  const payload = parseListingPage(html, { currentPage: page });
  return {
    show: show || null,
    ...payload,
    anime_list: payload.anime_list.map(normalizeAnimeItem),
    animeList: payload.animeList.map(normalizeAnimeItem),
  };
}

async function getList(params = {}) {
  const page = Number.parseInt(params.page, 10) || 1;
  const html = await get('/anime/', {
    status: params.status,
    type: params.type,
    order: params.order,
    page: page > 1 ? page : undefined,
  });

  const payload = parseListingPage(html, { currentPage: page });
  return {
    filters: {
      status: params.status || null,
      type: params.type || null,
      order: params.order || 'update',
    },
    ...payload,
    anime_list: payload.anime_list.map(normalizeAnimeItem),
    animeList: payload.animeList.map(normalizeAnimeItem),
  };
}

async function getByGenre(slug, { page = 1 } = {}) {
  const path = page > 1 ? `/genres/${slug}/page/${page}/` : `/genres/${slug}/`;
  const html = await get(path);
  const payload = parseListingPage(html, { currentPage: page });
  return {
    genre: slug,
    ...payload,
    anime_list: payload.anime_list.map(normalizeAnimeItem),
    animeList: payload.animeList.map(normalizeAnimeItem),
  };
}

async function getAllGenres() {
  const html = await get('/genres/action/');
  const $ = cheerio.load(html);
  const genres = [];
  const seen = new Set();

  $('a[href*="/genres/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = $(el).text().trim();
    if (!href || !title || /^\d+$/.test(title)) return;

    const genreSlug = slugFromUrl(href);
    if (!genreSlug || seen.has(genreSlug)) return;
    seen.add(genreSlug);

    genres.push({
      title,
      genreId: genreSlug,
      slug: genreSlug,
      href: `/anoboy/genre/${genreSlug}`,
      url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    });
  });

  return {
    genres,
    genreList: genres,
  };
}

module.exports = {
  getHome,
  search,
  getAnime,
  getEpisode,
  getAzList,
  getList,
  getByGenre,
  getAllGenres,
};