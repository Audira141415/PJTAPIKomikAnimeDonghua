'use strict';

/**
 * Oploverz Direct Scraper
 * Target: https://oploverz.bar  (override via env OPLOVERZ_BASE_URL)
 *
 * Theme: Animestream (WordPress)
 * Confirmed: /wp-content/themes/animestream/
 *
 * Selector SAMA dengan samehadaku.scraper.js karena
 * kedua site pakai turunan theme WordPress anime yang sama.
 *
 * ⚠  Oploverz sering ganti domain. Setelah ganti, update OPLOVERZ_BASE_URL
 *    di .env dan ganti maxRedirects di _http.js jika perlu.
 */

const cheerio = require('cheerio');
const { createHttpClient } = require('./_http');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://oploverz.bar';
const FALLBACK_BASE_URLS = [
  DEFAULT_BASE_URL,
  'https://oploverz.click',
  'https://oploverz.com',
];

const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.OPLOVERZ_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const fromSingle = process.env.OPLOVERZ_BASE_URL ? [process.env.OPLOVERZ_BASE_URL.trim()] : [];
  return [...new Set([...fromList, ...fromSingle, ...FALLBACK_BASE_URLS])];
}

const BASE_URLS = parseBaseUrls();
let activeBaseUrl = BASE_URLS[0] || DEFAULT_BASE_URL;

const clientsByBase = new Map(BASE_URLS.map((baseUrl) => [baseUrl, createHttpClient(baseUrl)]));

function getHttpClient(baseUrl) {
  if (!clientsByBase.has(baseUrl)) {
    clientsByBase.set(baseUrl, createHttpClient(baseUrl));
  }
  return clientsByBase.get(baseUrl);
}

const getBaseUrl = () => activeBaseUrl;

async function get(path, opts = {}, { cacheTtlMs = CACHE_TTL_MS } = {}) {
  const cacheKey = `oploverz:${activeBaseUrl}:${path}:${JSON.stringify(opts?.params || {})}`;

  return remember(cacheKey, cacheTtlMs, async () => {
    const candidateBaseUrls = [
      activeBaseUrl,
      ...BASE_URLS.filter((baseUrl) => baseUrl !== activeBaseUrl),
    ];

    let lastError = null;
    for (const baseUrl of candidateBaseUrls) {
      try {
        const html = await getHttpClient(baseUrl).get(path, opts);
        activeBaseUrl = baseUrl;
        return html;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error(`Failed to fetch oploverz path ${path}`);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const slugFromUrl = (url = '') => url.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';

function normalizeAnimeItem(item) {
  if (!item) return null;
  const animeId = item?.animeId || item?.slug || item?.id || null;
  return {
    ...item,
    episodes: item?.episodes ?? item?.episode ?? null,
    source: 'oploverz',
    id: animeId,
    animeId,
    slug: animeId,
  };
}

function normalizeEpisodeItem(item) {
  if (!item) return null;
  const episodeId = item?.episodeId || item?.episodeSlug || item?.id || null;
  return {
    ...item,
    source: 'oploverz',
    id: episodeId,
    episodeId,
    episodeSlug: episodeId,
  };
}

/**
 * Parse satu kartu anime dari listing page.
 * Animestream theme menggunakan `.bixbox .listupd article.bs`
 */
function parseCard($, el) {
  const $el  = $(el);
  const a    = $el.find('a').first();
  const href = a.attr('href') || '';

  const poster = (
    a.find('.limit img, .thumb img').first().attr('src') ||
    a.find('img').first().attr('src') ||
    a.find('img').first().attr('data-src') ||
    ''
  );

  const title = (
    a.find('.tt h3, .tt h2, h2.entry-title, h3.title').first().text().trim() ||
    a.attr('title') ||
    ''
  );

  const episode = a.find('.epxs, .ep, .epz').first().text()
    .replace(/[^0-9]/g, '').trim() || null;

  const type   = a.find('.typez, .type-badge').first().text().trim() || null;
  const status = a.find('.tlndn, .status').first().text().trim() || null;
  const score  = a.find('.sd, .numscore, .num').first().text()
    .replace(/[^0-9.]/g, '').trim() || '';

  const slug = slugFromUrl(href);
  if (!slug) return null;

  return {
    title, poster, type, status, score,
    episode     : episode || null,
    episodes    : episode || null,
    source      : 'oploverz',
    id          : slug,
    animeId     : slug,
    slug,
    href        : `/oploverz/anime/${slug}`,
    oploverz_url: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
  };
}

/** Parse halaman listing standar, return { animeList, currentPage, totalPages } */
function parseListingPage(html) {
  const $         = cheerio.load(html);
  const animeList = [];

  $('.listupd article.bs, .bixbox .listupd .bs, .animposx article').each((_, el) => {
    const card = parseCard($, el);
    if (card) animeList.push(card);
  });

  const pageText  = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPage  = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)')
    .last().text().trim();
  const currentPage = parseInt(pageText, 10) || 1;
  const totalPages  = parseInt(lastPage, 10) || currentPage;

  return { animeList, currentPage, totalPages };
}

/**
 * Parse detail page anime.
 * Animestream theme: `.spe span` untuk metadata, `.genxed a` untuk genre,
 * `.eplister li` untuk daftar episode.
 */
function parseDetailPage(html, slug) {
  const $ = cheerio.load(html);

  const title  = $('h1.entry-title').first().text().trim();
  const poster = (
    $('.thumb img, .bigcontent img').first().attr('src') ||
    $('.thumb img').first().attr('data-src') ||
    null
  );

  // Ambil nilai dari baris .spe span berdasarkan label <b>
  const getSpe = (key) => {
    let val = '';
    $('.spe span').each((_, el) => {
      const label = $(el).find('b').first().text().replace(':', '').trim();
      if (label.toLowerCase() === key.toLowerCase()) {
        val = $(el).clone().children('b').remove().end().text().trim();
        return false;
      }
    });
    return val;
  };

  const status    = getSpe('Status') || null;
  const type      = getSpe('Type') || null;
  const studio    = getSpe('Studios') || getSpe('Studio') || null;
  const duration  = getSpe('Duration') || null;
  const season    = getSpe('Season') || null;
  const source    = getSpe('Source') || null;
  const epsText   = getSpe('Episodes');
  const aired     = getSpe('Aired') || null;
  const producers = getSpe('Producers') || getSpe('Producer') || null;

  // Score
  const score = $('.num, .rating-prc, .numscore').first().text()
    .replace(/[^0-9.]/g, '').trim() || null;

  // Genres
  const genres = [];
  $('.genxed a, .genres a').each((_, el) => {
    const t = $(el).text().trim();
    if (t) genres.push(t);
  });

  // Synopsis
  const synParts = [];
  $('.entry-content p, .synp p, .infoanime p').each((_, el) => {
    const t = $(el).text().trim();
    if (t && t.length > 10) synParts.push(t);
  });

  // Daftar episode (format oploverz: terbaru di atas)
  const episodeList = [];
  $('.eplister li').each((_, el) => {
    const a       = $(el).find('a').first();
    const epHref  = a.attr('href') || '';
    const epSlug  = slugFromUrl(epHref);
    const epNum   = $(el).find('.epl-num').text().trim();
    const epTitle = $(el).find('.epl-title').text().trim();
    const epDate  = $(el).find('.epl-date').text().trim();
    if (!epSlug) return;
    episodeList.push({
      title        : epTitle || null,
      episodeSlug  : epSlug,
      href         : `/oploverz/episode/${epSlug}`,
      oploverz_url : epHref.startsWith('http') ? epHref : `${getBaseUrl()}${epHref}`,
      episodeNum   : epNum || null,
      releasedOn   : epDate || null,
    });
  });

  return {
    title, poster, status, type, score,
    studio, duration, season, source, aired, producers,
    totalEpisodes : epsText ? (parseInt(epsText, 10) || null) : null,
    synopsis      : synParts.join('\n\n') || null,
    genres,
    episodeList,
    source      : 'oploverz',
    id          : slug,
    animeId     : slug,
    slug,
    href          : `/oploverz/anime/${slug}`,
    oploverz_url  : `${getBaseUrl()}/anime/${slug}/`,
  };
}

/**
 * Parse halaman episode.
 */
function parseEpisodePage(html, epSlug) {
  const $ = cheerio.load(html);

  const title   = $('h1.entry-title, h1.epxtitle').first().text().trim();

  // Anime parent link
  const animeLink = $('.breadcrumb li:nth-last-child(2) a, .animeinfo a').first().attr('href') || '';
  const animeSlug = animeLink ? slugFromUrl(animeLink) : null;

  const defaultStream = $('iframe').first().attr('src') || '';

  // Prev / Next
  const prevHref = $('.naveps .btnl a, .epnavigation .prev a').first().attr('href') || '';
  const nextHref = $('.naveps .btnr a, .epnavigation .next a').first().attr('href') || '';

  const makeNav = (href) => {
    if (!href) return null;
    const id = slugFromUrl(href);
    return {
      episodeSlug  : id,
      href         : `/oploverz/episode/${id}`,
      oploverz_url : href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    };
  };

  // Server list
  const serverList = [];
  $('.mirrorss li, .muplod li, .server-list li').each((_, el) => {
    const a    = $(el).find('a').first();
    const name = a.text().trim() || $(el).text().trim();
    const sid  = a.attr('data-id') || '';
    if (name) serverList.push({ name, serverId: sid });
  });

  // Download links
  const downloadList = [];
  $('.soraddlx .soraurlx a, .download-area a, .dllink a').each((_, el) => {
    const label = $(el).text().trim();
    const url   = $(el).attr('href') || '';
    if (label && url) downloadList.push({ label, url });
  });

  return {
    title,
    source      : 'oploverz',
    id          : epSlug,
    episodeSlug : epSlug,
    episodeId   : epSlug,
    animeSlug,
    animeId     : animeSlug,
    defaultStreamingUrl : defaultStream,
    defaultStreamUrl : defaultStream,
    streamingUrl: defaultStream || null,
    prevEpisode      : normalizeEpisodeItem(makeNav(prevHref)),
    nextEpisode      : normalizeEpisodeItem(makeNav(nextHref)),
    serverList,
    downloadList,
    href         : `/oploverz/episode/${epSlug}`,
    oploverz_url : `${getBaseUrl()}/${epSlug}/`,
  };
}

// ── Public service methods ────────────────────────────────────────────────────

/** Home / terbaru page */
async function getHome({ page = 1 } = {}) {
  const path = page > 1 ? `/page/${page}/` : '/';
  const html = await get(path);
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

/** Jadwal rilis */
async function getSchedule() {
  // Coba beberapa URL umum
  const paths = ['/jadwal/', '/jadwal-rilis/', '/schedule/'];
  let html;
  let lastError;
  for (const p of paths) {
    try {
      html = await get(p);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!html) throw lastError || new Error('Failed to fetch oploverz schedule page');

  const $    = cheerio.load(html);
  const days = [];

  $('.scheduday, .schedule-day, .daysec').each((_, dayEl) => {
    const dayName    = $(dayEl).find('h2, h3, .day-name').first().text().trim();
    const animeItems = [];

    $(dayEl).find('li').each((__, item) => {
      const a     = $(item).find('a').first();
      const href  = a.attr('href') || '';
      const slug  = slugFromUrl(href);
      const title = a.text().trim() || $(item).find('.title').text().trim();
      const poster = $(item).find('img').attr('src') || '';
      if (title && slug) {
        animeItems.push({
          title, poster, source: 'oploverz', id: slug, animeId: slug, slug,
          href         : `/oploverz/anime/${slug}`,
          oploverz_url : href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
        });
      }
    });

    if (dayName) days.push({ day: dayName, animeList: animeItems });
  });

  return { days };
}

/** Anime ongoing */
async function getOngoing({ page = 1 } = {}) {
  // Coba beberapa URL fallback (oploverz sering pindah struktur)
  const paths = [
    `/ongoing-anime/page/${page}/`,
    `/anime/?status=ongoing&page=${page}`,
    `/anime/?status=Ongoing&page=${page}`,
  ];
  let html;
  let lastError;
  for (const p of paths) {
    try {
      html = await get(p);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!html) throw lastError || new Error('Failed to fetch oploverz ongoing page');
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

/** Anime completed */
async function getCompleted({ page = 1 } = {}) {
  const paths = [
    `/complete-anime/page/${page}/`,
    `/anime/?status=completed&page=${page}`,
    `/anime/?status=Completed&page=${page}`,
  ];
  let html;
  let lastError;
  for (const p of paths) {
    try {
      html = await get(p);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!html) throw lastError || new Error('Failed to fetch oploverz completed page');
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

/**
 * Daftar anime berdasarkan filter
 * status: ongoing|completed|upcoming
 * type: tv|movie|ova|ona|special
 * order: update|latest|popular|a-z|z-a
 */
async function getList({ page = 1, status = '', type = '', order = '' } = {}) {
  const params = { page };
  if (status) params.status = status;
  if (type)   params.type   = type;
  if (order)  params.order  = order;
  const html = await get('/anime/', { params });
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

/** Pencarian */
async function search(query, { page = 1 } = {}) {
  const params = { s: query };
  if (page > 1) params.page = page;
  const html = await get('/', { params });
  const { animeList } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), keyword: query };
}

/** Detail anime */
async function getAnime(slug) {
  const html = await get(`/anime/${slug}/`);
  return normalizeAnimeItem(parseDetailPage(html, slug));
}

/** Detail episode */
async function getEpisode(slug) {
  const html = await get(`/${slug}/`);
  return normalizeEpisodeItem(parseEpisodePage(html, slug));
}

module.exports = {
  getHome,
  getSchedule,
  getOngoing,
  getCompleted,
  getList,
  search,
  getAnime,
  getEpisode,
};
