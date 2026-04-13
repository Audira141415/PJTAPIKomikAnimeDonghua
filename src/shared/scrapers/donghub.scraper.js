'use strict';

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://donghub.vip';
const FALLBACK_BASE_URLS = [DEFAULT_BASE_URL];
const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.DONGHUB_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fromSingle = process.env.DONGHUB_BASE_URL ? [process.env.DONGHUB_BASE_URL.trim()] : [];
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
  const cacheKey = `donghub:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}`;

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

    throw lastError || new Error(`Failed to fetch donghub path ${path}`);
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
  const anchor = $el.is('a') ? $el : $el.find('a[href]').first();
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
  const type = $el.find('.typez').first().text().trim() || textParts.type || '';
  const status = $el.find('.sb, .status').first().text().trim() || textParts.status || 'Unknown';

  return {
    title,
    slug,
    poster,
    episode,
    type,
    status,
    sub: 'Sub',
    release_time: null,
    url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
  };
}

function parseListingPage(html, { currentPage = 1 } = {}) {
  const $ = cheerio.load(html);
  const data = [];
  const seen = new Set();

  $('.bsx, article.bs, .listupd article.bs').each((_, el) => {
    const item = parseAnimeCard($, el);
    if (!item || seen.has(item.slug)) return;
    seen.add(item.slug);
    data.push(item);
  });

  const pageText = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPageText = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)').last().text().trim();
  const parsedCurrentPage = Number.parseInt(pageText, 10) || currentPage;
  const totalPages = Number.parseInt(lastPageText, 10) || parsedCurrentPage;

  return {
    data,
    pagination: {
      current_page: parsedCurrentPage,
      last_visible_page: totalPages || null,
      has_next: parsedCurrentPage < totalPages,
    },
  };
}

function parseHomeSections(html) {
  const $ = cheerio.load(html);
  const bySection = { slider: [], popular: [], latest: [] };
  const seen = {
    slider: new Set(),
    popular: new Set(),
    latest: new Set(),
  };

  $('.bixbox').each((_, box) => {
    const heading = $(box).find('h2, h3').first().text().replace(/\s+/g, ' ').trim().toLowerCase();
    let bucket = null;
    if (heading.includes('popular')) bucket = 'popular';
    if (heading.includes('latest')) bucket = 'latest';
    if (!bucket) return;

    $(box).find('.bsx, article.bs').each((__, cardEl) => {
      const item = parseAnimeCard($, cardEl);
      if (!item || seen[bucket].has(item.slug)) return;
      seen[bucket].add(item.slug);
      bySection[bucket].push(item);
    });
  });

  // Slider fallback from first highlighted cards
  $('.bsx, article.bs').slice(0, 5).each((_, el) => {
    const item = parseAnimeCard($, el);
    if (!item || seen.slider.has(item.slug)) return;
    seen.slider.add(item.slug);
    bySection.slider.push({
      title: item.title,
      slug: item.slug,
      poster: item.poster,
      synopsis: '',
    });
  });

  return bySection;
}

function parseGenresFromPage(html) {
  const $ = cheerio.load(html);
  const genres = [];
  const seen = new Set();

  $('a[href*="/genres/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    const slug = slugFromUrl(href);
    if (!href || !name || !slug || seen.has(slug) || /^\d+$/.test(name)) return;
    seen.add(slug);
    genres.push({ name, slug, url: href.startsWith('http') ? href : `${getBaseUrl()}${href}` });
  });

  return genres;
}

function parseDetailPage(html, slug) {
  const $ = cheerio.load(html);

  const info = {};
  $('.spe span, .info p').each((_, el) => {
    const key = $(el).find('b').first().text().replace(':', '').trim().toLowerCase();
    const value = $(el).clone().children('b').remove().end().text().trim();
    if (key && value) info[key.replace(/\s+/g, '_')] = value;
  });

  const episodes = [];
  const seen = new Set();
  $('.eplister li a[href], a[href*="episode-"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = $(el).text().replace(/\s+/g, ' ').trim();
    const episodeSlug = slugFromUrl(href);
    if (!href || !episodeSlug || seen.has(episodeSlug)) return;
    seen.add(episodeSlug);
    const num = title.match(/episode\s*(\d+)/i)?.[1] || '';

    episodes.push({
      episode: num,
      title,
      slug: episodeSlug,
      date: $(el).closest('li').find('.epl-date').first().text().trim() || '',
      url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    });
  });

  return {
    title: $('h1.entry-title,h1').first().text().trim() || slug,
    poster: (
      $('.thumb img, .bigcontent img, .post-thumb img').first().attr('src') ||
      $('.thumb img, .bigcontent img, .post-thumb img').first().attr('data-src') ||
      null
    ),
    rating: $('.num, .rating-prc, .numscore').first().text().replace(/[^0-9.]/g, '').trim() || '',
    synopsis: $('.entry-content, .desc, .sinopsis').first().text().replace(/\s+/g, ' ').trim() || '',
    info: {
      status: info.status || 'Unknown',
      network: info.network || '',
      studio: info.studio || info.studios || '',
      released: info.released || '',
      country: info.country || '',
      type: info.type || '',
      episodes: info.episodes || '',
      fansub: info.fansub || '',
      casts: info.casts || '',
      released_on: info.released_on || '',
      updated_on: info.updated_on || '',
    },
    genres: parseGenresFromPage(html),
    batch_link: null,
    episodes,
  };
}

function parseEpisodePage(html, slug) {
  const $ = cheerio.load(html);

  const streams = [];
  $('iframe').each((_, iframe) => {
    const url = $(iframe).attr('src') || $(iframe).attr('data-src') || '';
    if (!url) return;
    streams.push({ server: streams.length === 0 ? 'Main Server' : `Server ${streams.length + 1}`, url });
  });

  const genres = parseGenresFromPage(html).map((genre) => ({ name: genre.name, url: genre.url }));
  const related_episodes = [];
  const seenRel = new Set();
  $('.bsx a[href*="episode-"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const relSlug = slugFromUrl(href);
    if (!href || !relSlug || seenRel.has(relSlug) || relSlug === slug) return;
    seenRel.add(relSlug);
    related_episodes.push({
      title: $(el).text().replace(/\s+/g, ' ').trim(),
      url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
      slug: relSlug,
      thumbnail: $(el).find('img').attr('src') || '',
      posted_by: 'Admin',
      posted_date: '',
    });
  });

  return {
    title: $('h1.entry-title,h1').first().text().trim() || slug,
    release_date: $('.epxdate, .date, time').first().text().trim() || '',
    navigation: {
      prev_slug: slugFromUrl($('.naveps a[rel="prev"]').first().attr('href') || ''),
      next_slug: slugFromUrl($('.naveps a[rel="next"]').first().attr('href') || ''),
      all_slug: slugFromUrl($('.naveps a[href*="/anime/"]').first().attr('href') || ''),
    },
    streams,
    downloads: [],
    anime_info: {
      title: $('.naveps a[href*="/anime/"]').first().text().trim() || '',
      slug: slugFromUrl($('.naveps a[href*="/anime/"]').first().attr('href') || ''),
      thumbnail: $('.thumb img, .bigcontent img').first().attr('src') || '',
      rating: $('.num, .rating-prc, .numscore').first().text().trim() || '',
      rating_percentage: '',
      status: 'Unknown',
      network: '',
      studio: '',
      released: '',
      country: '',
      type: '',
      episodes: '',
      fansub: '',
      genres,
      synopsis: $('.entry-content, .desc, .sinopsis').first().text().replace(/\s+/g, ' ').trim() || '',
    },
    related_episodes,
    recommended_series: [],
  };
}

async function getHome() {
  const html = await get('/');
  return parseHomeSections(html);
}

async function getLatest({ page = 1 } = {}) {
  const path = page > 1 ? `/page/${page}/` : '/';
  const parsed = parseListingPage(await get(path), { currentPage: page });
  return {
    data: parsed.data,
    anime_list: parsed.data,
    animeList: parsed.data,
    pagination: parsed.pagination,
  };
}

async function getPopular({ page = 1 } = {}) {
  const home = await getHome();
  const data = page === 1 ? home.popular : [];
  return {
    data,
    anime_list: data,
    animeList: data,
    pagination: {
      current_page: page,
      last_visible_page: page,
      has_next: false,
    },
  };
}

async function getMovies({ page = 1 } = {}) {
  const list = await getList({ page });
  const filtered = (list.data || []).filter((item) => /movie/i.test(`${item.type || ''} ${item.title || ''} ${item.status || ''}`));
  return {
    data: filtered,
    anime_list: filtered,
    animeList: filtered,
    pagination: list.pagination,
  };
}

async function getSchedule() {
  const parsed = parseListingPage(await get('/schedule/'));
  return {
    days: [
      {
        day: 'Schedule',
        anime_list: parsed.data,
      },
    ],
  };
}

async function search(query) {
  const q = String(query || '').trim();
  if (!q) return { data: [], anime_list: [], animeList: [] };
  const parsed = parseListingPage(await get('/', { s: q }));
  return { data: parsed.data, anime_list: parsed.data, animeList: parsed.data };
}

async function getByGenre(slug) {
  const parsed = parseListingPage(await get(`/genres/${slug}/`));
  return {
    data: parsed.data,
    anime_list: parsed.data,
    animeList: parsed.data,
    pagination: parsed.pagination,
  };
}

async function getList(params = {}) {
  const page = Number.parseInt(params.page, 10) || 1;
  const path = page > 1 ? `/anime/page/${page}/` : '/anime/';
  const parsed = parseListingPage(await get(path));
  return {
    data: parsed.data,
    anime_list: parsed.data,
    animeList: parsed.data,
    pagination: parsed.pagination,
  };
}

async function getDetail(slug) {
  return parseDetailPage(await get(`/${slug}/`), slug);
}

async function getEpisode(slug) {
  return parseEpisodePage(await get(`/${slug}/`), slug);
}

module.exports = {
  getHome,
  getLatest,
  getPopular,
  getMovies,
  getSchedule,
  search,
  getByGenre,
  getList,
  getDetail,
  getEpisode,
};
