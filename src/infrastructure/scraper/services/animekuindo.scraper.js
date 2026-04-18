'use strict';

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://s2.animekuindo.life';
const FALLBACK_BASE_URLS = [
  DEFAULT_BASE_URL,
  'https://animekuindo.app',
];

const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.ANIMEKUINDO_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const fromSingle = process.env.ANIMEKUINDO_BASE_URL ? [process.env.ANIMEKUINDO_BASE_URL.trim()] : [];
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
  const cacheKey = `animekuindo:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}`;

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

    throw lastError || new Error(`Failed to fetch animekuindo path ${path}`);
  });
}

function parseAnimeCard($, el) {
  const $el = $(el);
  const a = $el.find('a[href]').first();
  const href = a.attr('href') || '';
  if (!href) return null;

  const slug = slugFromUrl(href);
  if (!slug) return null;

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

  const type = $el.find('.typez').first().text().trim() || null;
  const status = $el.find('.status, .tlndn').first().text().trim() || 'Unknown';
  const episode = $el.find('.epx, .epxs, .ep').first().text().trim() || null;

  return {
    title,
    slug,
    poster,
    type,
    status,
    episode,
    url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    href: `/animekuindo/episode/${slug}`,
    source: 'animekuindo',
    id: slug,
  };
}

function parseListingPage(html, { currentPage = 1 } = {}) {
  const $ = cheerio.load(html);
  const animeList = [];
  const seen = new Set();

  $('.listupd article.bs, article.bs').each((_, el) => {
    const card = parseAnimeCard($, el);
    if (!card || seen.has(card.slug)) return;
    seen.add(card.slug);
    animeList.push(card);
  });

  if (!animeList.length) {
    $('a[href*="subtitle-indonesia"], a[href*="/anime/"]').each((_, anchor) => {
      const $anchor = $(anchor);
      const href = $anchor.attr('href') || '';
      const slug = slugFromUrl(href);
      if (!slug) return;

      const container = $anchor.closest('article, li, .kover, .detpost, .venz, .venser, .post, .entry');
      const card = {
        title: $anchor.attr('title') || $anchor.text().trim(),
        slug,
        poster: (
          container.find('img').first().attr('src') ||
          container.find('img').first().attr('data-src') ||
          ''
        ),
        type: container.find('.typez').first().text().trim() || null,
        status: container.find('.status, .tlndn').first().text().trim() || 'Unknown',
        episode: container.find('.epx, .epxs, .ep').first().text().trim() || null,
        url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
        href: href.includes('/anime/') ? `/animekuindo/detail/${slug}` : `/animekuindo/episode/${slug}`,
        source: 'animekuindo',
        id: slug,
      };

      if (!card || seen.has(card.slug)) return;
      seen.add(card.slug);
      animeList.push(card);
    });
  }

  const pageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPageText = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)')
    .last().text().trim();

  const parsedCurrentPage = Number.parseInt(pageText, 10) || currentPage;
  const totalPages = Number.parseInt(lastPageText, 10) || parsedCurrentPage;

  return {
    animeList,
    currentPage: parsedCurrentPage,
    totalPages,
    pagination: {
      hasNext: parsedCurrentPage < totalPages,
      hasPrev: parsedCurrentPage > 1,
      currentPage: parsedCurrentPage,
    },
  };
}

function parseAnimeDetail(html, slug) {
  const $ = cheerio.load(html);

  const title = $('h1.entry-title, h1').first().text().trim() || slug;
  const poster = (
    $('.thumb img, .bigcontent img').first().attr('src') ||
    $('.thumb img, .bigcontent img').first().attr('data-src') ||
    null
  );

  const rating = $('.num, .rating-prc, .numscore').first().text().replace(/[^0-9.]/g, '').trim() || null;

  const synopsisParts = [];
  $('.entry-content p, .synp p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10) synopsisParts.push(text);
  });

  const info = {};
  $('.spe span').each((_, el) => {
    const key = $(el).find('b').first().text().replace(':', '').trim();
    const value = $(el).clone().children('b').remove().end().text().trim();
    if (key && value) info[key.toLowerCase().replace(/\s+/g, '_')] = value;
  });

  $('.info p').each((_, el) => {
    const raw = $(el).text().trim();
    const parts = raw.split(':');
    if (parts.length < 2) return;
    const key = parts.shift().trim().toLowerCase().replace(/\s+/g, '_');
    const value = parts.join(':').trim();
    if (key && value && !info[key]) info[key] = value;
  });

  const genres = [];
  $('.genxed a, .genres a, .info a[href*="/genres/"]').each((_, el) => {
    const name = $(el).text().trim();
    const href = $(el).attr('href') || '';
    const genreSlug = slugFromUrl(href);
    if (name && genreSlug) {
      genres.push({
        name,
        slug: genreSlug,
        url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
      });
    }
  });

  const dedupGenres = [...new Map(genres.map((genre) => [genre.slug, genre])).values()];

  const episodeList = [];
  $('.eplister li').each((_, el) => {
    const a = $(el).find('a[href]').first();
    const epUrl = a.attr('href') || '';
    const epSlug = slugFromUrl(epUrl);
    if (!epSlug) return;

    episodeList.push({
      episode: $(el).find('.epl-num').text().trim() || null,
      title: $(el).find('.epl-title').text().trim() || a.text().trim() || null,
      release_date: $(el).find('.epl-date').text().trim() || null,
      slug: epSlug,
      url: epUrl.startsWith('http') ? epUrl : `${getBaseUrl()}${epUrl}`,
    });
  });

  const recommendations = [];
  $('.listupd article.bs, article.bs').each((_, el) => {
    const item = parseAnimeCard($, el);
    if (item && item.slug !== slug) {
      recommendations.push(item);
    }
  });

  return {
    title,
    poster,
    rating,
    synopsis: synopsisParts.join('\n').trim() || null,
    info,
    genres: dedupGenres,
    episode_list: episodeList,
    episodeList,
    recommendations,
    id: slug,
    slug,
    source: 'animekuindo',
    url: `${getBaseUrl()}/anime/${slug}/`,
  };
}

function parseEpisodeDetail(html, slug) {
  const $ = cheerio.load(html);
  const title = $('h1.entry-title, h1').first().text().trim() || slug;
  const animeHref = $('.entry-info a[href*="/anime/"], .naveps a[href*="/anime/"]').first().attr('href') || '';
  const animeSlug = slugFromUrl(animeHref);

  const streams = [];
  $('iframe').each((_, iframe) => {
    const src = $(iframe).attr('src') || $(iframe).attr('data-src') || '';
    if (!src || src === 'javascript:false') return;
    streams.push({
      server: streams.length === 0 ? 'Main Embed' : `Embed ${streams.length + 1}`,
      url: src,
    });
  });

  const downloads = [];
  $('.soraddlx .soraurlx a, .download-area a, .dllink a').each((_, el) => {
    const label = $(el).text().trim();
    const url = $(el).attr('href') || '';
    if (label && url && url !== '#') downloads.push({ label, url });
  });

  return {
    title,
    anime_slug: animeSlug || null,
    streams,
    downloads,
    id: slug,
    slug,
    source: 'animekuindo',
    url: `${getBaseUrl()}/${slug}/`,
  };
}

async function getHome({ page = 1 } = {}) {
  const path = page > 1 ? `/page/${page}/` : '/';
  const html = await get(path);
  const parsed = parseListingPage(html, { currentPage: page });

  return {
    hero: null,
    latest: parsed.animeList,
    pagination: parsed.pagination,
  };
}

async function getSchedule() {
  const html = await get('/jadwal-rilis/');
  const $ = cheerio.load(html);
  const days = [];

  $('.scheduday, .schedule-day, .daysec').each((_, dayEl) => {
    const day = $(dayEl).find('h2, h3, .day-name').first().text().trim();
    const anime_list = [];

    $(dayEl).find('li, .scheduleitem').each((__, item) => {
      const a = $(item).find('a[href]').first();
      const href = a.attr('href') || '';
      const slug = slugFromUrl(href);
      const title = a.text().trim() || $(item).find('.title').text().trim();
      if (!slug || !title) return;

      anime_list.push({
        title,
        slug,
        poster: $(item).find('img').attr('src') || null,
        type: $(item).find('.typez').text().trim() || null,
        episode: $(item).find('.epx, .epxs').first().text().trim() || null,
        url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
      });
    });

    if (day) days.push({ day, anime_list });
  });

  return { schedule: days };
}

async function getLatest({ page = 1 } = {}) {
  const path = page > 1 ? `/page/${page}/` : '/';
  const html = await get(path);
  const parsed = parseListingPage(html, { currentPage: page });
  return {
    anime_list: parsed.animeList,
    animeList: parsed.animeList,
    pagination: parsed.pagination,
  };
}

async function getPopular({ page = 1 } = {}) {
  const path = page > 1 ? `/popular/page/${page}/` : '/popular/';
  const html = await get(path);
  const parsed = parseListingPage(html, { currentPage: page });
  return {
    anime_list: parsed.animeList,
    animeList: parsed.animeList,
    pagination: parsed.pagination,
  };
}

async function getMovies({ page = 1 } = {}) {
  const path = page > 1 ? `/anime-movie/page/${page}/` : '/anime-movie/';
  const html = await get(path);
  const parsed = parseListingPage(html, { currentPage: page });
  return {
    anime_list: parsed.animeList,
    animeList: parsed.animeList,
    pagination: parsed.pagination,
  };
}

async function search(query) {
  const keyword = String(query || '').trim();
  if (!keyword) return { anime_list: [], animeList: [] };

  const html = await get('/', { s: keyword });
  const parsed = parseListingPage(html, { currentPage: 1 });
  return {
    anime_list: parsed.animeList,
    animeList: parsed.animeList,
    query: keyword,
  };
}

async function getGenres() {
  const html = await get('/genres/action/');
  const $ = cheerio.load(html);
  const data = [];
  const seen = new Set();

  $('a[href*="/genres/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (!href || !name || /^\d+$/.test(name)) return;

    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);

    data.push({
      name,
      slug,
      count: null,
      url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    });
  });

  return { data };
}

async function getByGenre(slug) {
  const html = await get(`/genres/${slug}/`);
  const parsed = parseListingPage(html, { currentPage: 1 });
  return {
    anime_list: parsed.animeList,
    animeList: parsed.animeList,
    genre: slug,
    pagination: parsed.pagination,
  };
}

async function getSeasons() {
  const html = await get('/season/');
  const $ = cheerio.load(html);
  const data = [];
  const seen = new Set();

  const regexMatches = html.match(/\/season\/([a-z]+-\d{4})\//gi) || [];
  regexMatches.forEach((match) => {
    const slugMatch = match.match(/\/season\/([^/]+)\//i);
    const slug = slugMatch ? slugMatch[1] : '';
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    const name = slug.replace('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    data.push({ name, slug, url: `${getBaseUrl()}/season/${slug}/` });
  });

  $('a[href*="/season/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    if (!href || /^\d+$/.test(name)) return;
    const slug = slugFromUrl(href);
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    data.push({
      name: name || slug.replace('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      slug,
      url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    });
  });

  return { data };
}

async function getBySeason(slug) {
  const html = await get(`/season/${slug}/`);
  const parsed = parseListingPage(html, { currentPage: 1 });
  return {
    anime_list: parsed.animeList,
    animeList: parsed.animeList,
    season: slug,
    pagination: parsed.pagination,
  };
}

async function getDetail(slug) {
  const html = await get(`/anime/${slug}/`);
  return parseAnimeDetail(html, slug);
}

async function getEpisode(slug) {
  const html = await get(`/${slug}/`);
  return parseEpisodeDetail(html, slug);
}

module.exports = {
  getHome,
  getSchedule,
  getLatest,
  getPopular,
  getMovies,
  search,
  getGenres,
  getByGenre,
  getSeasons,
  getBySeason,
  getDetail,
  getEpisode,
};
