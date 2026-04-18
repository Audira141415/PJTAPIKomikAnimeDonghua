'use strict';

/**
 * Samehadaku Direct Scraper
 * Target: https://v2.samehadaku.how  (override via env SAMEHADAKU_BASE_URL)
 *
 * Theme: Kotakimia / Shakugan Xtream (sama dengan anichin.cafe)
 * Cheerio selector dikonfirmasi dari anichin-scraper.js yang sudah jalan.
 *
 * Semua method return format SAMA PERSIS dengan Sanka Vollerei API
 * sehingga samehadaku.service.js tidak perlu diubah sama sekali.
 *
 * ⚠  Jika selector berubah (site update), cari perbedaan di:
 *    https://v2.samehadaku.how/anime-terbaru/   ← listing page
 *    https://v2.samehadaku.how/anime/one-piece/ ← detail page
 *    https://v2.samehadaku.how/one-piece-episode-1157/ ← episode page
 */

const cheerio = require('cheerio');
const { playwrightGet } = require('./_playwright');
const { remember } = require('./_cache');

const DEFAULT_BASE_URL = 'https://v2.samehadaku.how';
const FALLBACK_BASE_URLS = [
  DEFAULT_BASE_URL,
  'https://v1.samehadaku.how',
  'https://samehadaku.email',
];

const CACHE_TTL_MS = Number.parseInt(process.env.SCRAPER_CACHE_TTL_MS || '60000', 10);

function parseBaseUrls() {
  const fromList = (process.env.SAMEHADAKU_BASE_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const fromSingle = process.env.SAMEHADAKU_BASE_URL ? [process.env.SAMEHADAKU_BASE_URL.trim()] : [];
  return [...new Set([...fromList, ...fromSingle, ...FALLBACK_BASE_URLS])];
}

const BASE_URLS = parseBaseUrls();
let activeBaseUrl = BASE_URLS[0] || DEFAULT_BASE_URL;

const getBaseUrl = () => activeBaseUrl;

/** Wrapper: fetch URL lengkap dengan Playwright (bypass CF JS challenge) */
const buildUrl = (baseUrl, path, params) => {
  let url = `${baseUrl}${path}`;
  if (params && Object.keys(params).length) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
    ).toString();
    if (qs) url += (url.includes('?') ? '&' : '?') + qs;
  }
  return url;
};

const get = async (path, params, { cacheTtlMs = CACHE_TTL_MS } = {}) => {
  const cacheKey = `samehadaku:${activeBaseUrl}:${path}:${JSON.stringify(params || {})}`;

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

    throw lastError || new Error(`Failed to fetch samehadaku path ${path}`);
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Ekstrak slug dari URL: "/anime/one-piece/" → "one-piece" */
const slugFromUrl = (url = '') => url.replace(/\/$/, '').split('/').filter(Boolean).pop() || '';

/** Bangun object ref untuk item di listing */
const buildRef = (urlPath, source = 'samehadaku') => ({
  href          : `/${source}${urlPath}`,
  samehadakuUrl : urlPath.startsWith('http') ? urlPath : `${getBaseUrl()}${urlPath}`,
});

function normalizeAnimeItem(item) {
  if (!item) return null;
  const animeId = item?.animeId || item?.slug || item?.id || null;
  return {
    ...item,
    source: 'samehadaku',
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
    source: 'samehadaku',
    id: episodeId,
    episodeId,
    episodeSlug: episodeId,
  };
}

/**
 * Parse satu kartu anime dari listing page.
 * Selector compatible dengan Kotakimia / Shakugan Xtream theme.
 *
 * HTML tipikal:
 *   <article class="bs">
 *     <div class="bsx">
 *       <a href="/anime/slug/">
 *         <div class="limit"><img src="poster" /></div>
 *         <div class="tt">
 *           <h2 class="entry-title">TITLE</h2>
 *           <span class="epxs">Ep 12</span>
 *           <div class="typez">TV</div>
 *         </div>
 *       </a>
 *     </div>
 *   </article>
 */
function parseCard($, el) {
  const $el  = $(el);
  const a    = $el.find('h2.entry-title a, a[title][href*="/anime/"], a[href*="/anime/"]').filter((_, node) => {
    const href = $(node).attr('href') || '';
    return href.includes('/anime/');
  }).first();
  const href = a.attr('href') || '';

  // Poster — coba beberapa selector umum
  const poster = (
    $el.find('.thumb img, .limit img, .timgd img').first().attr('src') ||
    a.find('.limit img, .thumb img, .timgd img').first().attr('src') ||
    a.find('img').first().attr('src') ||
    a.find('img').first().attr('data-src') ||
    ''
  );

  // Title — beberapa varian
  const title = (
    $el.find('.dtla .entry-title a, h2.entry-title a, .tt h3, .tt h2, h3.title, .animposx .title').first().text().trim() ||
    a.text().trim() ||
    a.attr('title') ||
    ''
  );

  // Episode count text
  const episodes = ($el.find('.epxs, .ep, .epz, .episode, .dtla span').filter((_, node) => {
    return /episode/i.test($(node).text());
  }).first().text() || '')
    .replace(/[^0-9]/g, '').trim() || null;

  // Type badge
  const type = $el.find('.typez, .type-badge').first().text().trim() || null;

  // Status
  const status = $el.find('.tlndn, .status').first().text().trim() || null;

  // Score
  const score = $el.find('.sd, .numscore, .rating-num, .num').first().text()
    .replace(/[^0-9.]/g, '').trim() || '';

  // Genres (sebagian listing page, terutama ongoing/completed)
  const genreList = [];
  $el.find('.genxed a, .genres a, .genre a').each((_, g) => {
    const gTitle   = $(g).text().trim();
    const gHref    = $(g).attr('href') || '';
    const genreId  = slugFromUrl(gHref);
    if (gTitle) {
      genreList.push({
        title    : gTitle,
        genreId,
        href     : `/samehadaku/genres/${genreId}`,
        samehadakuUrl: gHref.startsWith('http') ? gHref : `${getBaseUrl()}${gHref}`,
      });
    }
  });

  // Released on (untuk recent page)
  const releasedOnNode = $el.find('.bt > span, .limit .bt span, .info .time, .dtla span').filter((_, node) => {
    return /released on/i.test($(node).text()) || /yang lalu|ago/i.test($(node).text());
  }).last().text().replace(/^.*Released on\s*:\s*/i, '').trim();

  const animeId = slugFromUrl(href);
  if (!animeId) return null;

  return {
    title,
    poster,
    type,
    score,
    status,
    episodes,
    releasedOn : releasedOnNode || null,
    genreList  : genreList.length ? genreList : undefined,
    id: animeId,
    source: 'samehadaku',
    animeId,
    slug: animeId,
    ...buildRef(href.startsWith('http') ? new URL(href).pathname : href),
  };
}

/**
 * Parse halaman listing standar (terbaru, ongoing, completed, movie, popular).
 * Mengembalikan { animeList, currentPage, totalPages }.
 */
function parseListingPage(html) {
  const $          = cheerio.load(html);
  const animeList  = [];
  const seenAnimeIds = new Set();

  // Theme baru samehadaku memakai list item dengan .thumb + .dtla.
  // Ambil berdasarkan anchor judul agar tidak tergantung wrapper tertentu.
  $('h2.entry-title a[href*="/anime/"], a[href*="/anime/"][title]').each((_, link) => {
    const href = $(link).attr('href') || '';
    if (!href.includes('/anime/')) return;

    const container = $(link).closest('li, article, .post-show, .post-body, .list-group-item, .row');
    const card = parseCard($, container.length ? container : link);
    if (card && !seenAnimeIds.has(card.animeId)) {
      seenAnimeIds.add(card.animeId);
      animeList.push(card);
    }
  });

  // Pagination
  const pageText   = $('.pagination .current, .page-numbers.current').first().text().trim();
  const lastPage   = $('.pagination .last, .page-numbers:not(.next):not(.prev):not(.dots)')
    .last().text().trim();
  const currentPage = parseInt(pageText, 10) || 1;
  const totalPages  = parseInt(lastPage, 10) || currentPage;

  return { animeList, currentPage, totalPages };
}

/**
 * Parse detail page anime.
 * Selector SAMA dengan anichin-scraper.js (confirmed working).
 */
function parseDetailPage(html, animeId) {
  const $ = cheerio.load(html);

  const title    = $('h1.entry-title').first().text().trim() ||
                   $('h1').first().text().trim();

  const poster   = (
    $('.thumb img, .bigcontent img, .thumbook img').first().attr('src') ||
    $('.thumb img, .bigcontent img').first().attr('data-src') ||
    null
  );

  // Helper: ambil nilai dari baris .spe span dengan label tertentu
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

  const japanese  = getSpe('Japanese') || null;
  const synonyms  = getSpe('Synonyms') || getSpe('Synonym') || null;
  const english   = getSpe('English') || null;
  const status    = getSpe('Status') || null;
  const type      = getSpe('Type') || null;
  const source    = getSpe('Source') || null;
  const duration  = getSpe('Duration') || null;
  const epsText   = getSpe('Episodes');
  const season    = getSpe('Season') || null;
  const studios   = getSpe('Studios') || getSpe('Studio') || null;
  const producers = getSpe('Producers') || getSpe('Producer') || null;
  const aired     = getSpe('Aired') || null;

  // Score + users
  const scoreVal   = $('.num, .rating-prc').first().text().replace(/[^0-9.]/g, '').trim();
  const scoreUsers = $('.numvote, .votes').first().text().replace(/[^0-9,]/g, '').trim();

  // Trailer
  const trailer = $('iframe[src*="youtube"]').first().attr('src') ||
                  $('iframe[src*="youtu.be"]').first().attr('src') || '';

  // Genres
  const genreList = [];
  $('.genxed a, .genres a').each((_, el) => {
    const gTitle  = $(el).text().trim();
    const gHref   = $(el).attr('href') || '';
    const genreId = slugFromUrl(gHref);
    if (gTitle) {
      genreList.push({
        title    : gTitle,
        genreId,
        href     : `/samehadaku/genres/${genreId}`,
        samehadakuUrl: gHref.startsWith('http') ? gHref : `${getBaseUrl()}${gHref}`,
      });
    }
  });

  // Synopsis
  const synParts = [];
  $('.entry-content p, .synp p').each((_, el) => {
    const t = $(el).text().trim();
    if (t) synParts.push(t);
  });

  // Episode list (inside detail page)
  const episodeList = [];
  $('.eplister li').each((_, el) => {
    const a         = $(el).find('a').first();
    const epHref    = a.attr('href') || '';
    const epNumTxt  = $(el).find('.epl-num').text().trim();
    const epTitle   = $(el).find('.epl-title').text().trim();
    const epDateTxt = $(el).find('.epl-date').text().trim();
    const episodeId = slugFromUrl(epHref);
    if (!episodeId) return;
    episodeList.push({
      title    : epTitle || null,
      episodeId,
      href     : `/samehadaku/episode/${episodeId}`,
      samehadakuUrl: epHref.startsWith('http') ? epHref : `${getBaseUrl()}${epHref}`,
      episodeNum   : epNumTxt || null,
      releasedOn   : epDateTxt || null,
    });
  });

  return {
    title,
    poster,
    score       : { value: scoreVal || null, users: scoreUsers || null },
    japanese,
    synonyms,
    english,
    status,
    type,
    source,
    duration,
    episodes    : epsText ? (parseInt(epsText, 10) || null) : null,
    season,
    studios,
    producers,
    aired,
    trailer,
    synopsis    : { paragraphs: synParts, connections: [] },
    genreList,
    episodeList,
    id         : animeId || null,
    slug       : animeId || null,
    sourceName : 'samehadaku',
    animeId     : animeId || null,
    href        : animeId ? `/samehadaku/anime/${animeId}` : null,
    samehadakuUrl: `${getBaseUrl()}/anime/${animeId}/`,
  };
}

/**
 * Parse halaman episode.
 */
function parseEpisodePage(html, episodeId) {
  const $ = cheerio.load(html);

  const title    = $('h1.entry-title, h1.epxtitle').first().text().trim();
  const animeId  = $('div[itemprop="partOfSeries"] a, .breadcrumb li:nth-last-child(2) a')
    .first().attr('href');

  // Default streaming URL dari iframe pertama
  const defaultStreamingUrl = $('iframe').first().attr('src') || '';

  // Prev / Next episode nav
  const prevHref  = $('.naveps .btnl a, .epnavigation .prev a').first().attr('href') || '';
  const nextHref  = $('.naveps .btnr a, .epnavigation .next a').first().attr('href') || '';

  const makePrevNext = (href) => {
    if (!href) return null;
    const id = slugFromUrl(href);
    return {
      episodeId : id,
      href      : `/samehadaku/episode/${id}`,
      samehadakuUrl: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
    };
  };

  // Mirror / Server list
  const serverList = [];
  $('.mirrorss li, .muplod li, .server-list li').each((_, el) => {
    const a        = $(el).find('a').first();
    const serverId = $(el).find('a, span').attr('data-id')
                  || $(el).find('a').attr('data-id') || '';
    const name     = a.text().trim() || $(el).text().trim();
    if (name) serverList.push({ name, serverId });
  });

  // Download links
  const downloadList = [];
  $('.soraddlx .soraurlx a, .download-area a, .dllink a').each((_, el) => {
    const text  = $(el).text().trim();
    const dlUrl = $(el).attr('href') || '';
    if (text && dlUrl) downloadList.push({ label: text, url: dlUrl });
  });

  return {
    title,
    source      : 'samehadaku',
    id          : episodeId,
    slug        : episodeId,
    episodeId,
    animeId   : animeId ? slugFromUrl(animeId) : null,
    episodeSlug: episodeId,
    defaultStreamingUrl,
    streamingUrl: defaultStreamingUrl || null,
    hasPrevEpisode : !!prevHref,
    prevEpisode    : normalizeEpisodeItem(makePrevNext(prevHref)),
    hasNextEpisode : !!nextHref,
    nextEpisode    : normalizeEpisodeItem(makePrevNext(nextHref)),
    serverList,
    downloadList,
    href      : `/samehadaku/episode/${episodeId}`,
    samehadakuUrl : `${getBaseUrl()}/${episodeId}/`,
  };
}

// ── Public service methods ────────────────────────────────────────────────────

async function getRecent({ page = 1 } = {}) {
  const path = page > 1 ? `/anime-terbaru/page/${page}/` : '/anime-terbaru/';
  const html = await get(path);
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

async function getOngoing({ page = 1, order = 'update' } = {}) {
  // URL berbeda-beda antara update site; coba beberapa variant
  const paths = [`/anime-ongoing/page/${page}/`, `/ongoing-anime/page/${page}/`];
  let html;
  let lastError;
  for (const p of paths) {
    try {
      html = await get(p, order !== 'update' ? { order } : {});
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!html) throw lastError || new Error('Failed to fetch samehadaku ongoing page');
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

async function getCompleted({ page = 1, order = 'latest' } = {}) {
  const paths = [`/anime-complete/page/${page}/`, `/complete-anime/page/${page}/`];
  let html;
  let lastError;
  for (const p of paths) {
    try {
      html = await get(p, order !== 'latest' ? { order } : {});
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!html) throw lastError || new Error('Failed to fetch samehadaku completed page');
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

async function getPopular({ page = 1 } = {}) {
  const path = page > 1 ? `/popular/page/${page}/` : '/popular/';
  const html = await get(path);
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

async function getMovies({ page = 1, order = 'update' } = {}) {
  const path = page > 1 ? `/anime-movie/page/${page}/` : '/anime-movie/';
  const html = await get(path, order !== 'update' ? { order } : {});
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

/** A-Z list semua anime */
async function getList() {
  const html  = await get('/daftar-anime-2/', { list: '' });
  const $     = cheerio.load(html);
  const result = [];

  // Coba group alphabetical — pola umum WP anime list
  let currentGroup = null;
  $('h2, h3, .lcp_catlist_anchor, ul.lcp_catlist').each((_, el) => {
    const tag = el.tagName?.toLowerCase();
    if (tag === 'h2' || tag === 'h3') {
      currentGroup = $(el).text().trim().toUpperCase().charAt(0) || '#';
    } else if ($(el).hasClass('lcp_catlist')) {
      const items = [];
      $(el).find('li a').each((__, a) => {
        const href    = $(a).attr('href') || '';
        const animeId = slugFromUrl(href);
        const title   = $(a).text().trim();
        if (title && animeId) {
          items.push({
            title, animeId,
            href          : `/samehadaku/anime/${animeId}`,
            samehadakuUrl : href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
          });
        }
      });
      if (items.length) result.push({ startWith: currentGroup || '#', animeList: items });
    }
  });

  // Fallback: semua link di halaman yang mengarah ke /anime/
  if (!result.length) {
    const grouped = {};
    $('a[href*="/anime/"]').each((_, el) => {
      const href    = $(el).attr('href') || '';
      const animeId = slugFromUrl(href);
      const title   = $(el).text().trim();
      if (!title || !animeId || href.includes('/page/')) return;
      const letter = title.charAt(0).toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push({
        title, animeId,
        href          : `/samehadaku/anime/${animeId}`,
        samehadakuUrl : `${getBaseUrl()}/anime/${animeId}/`,
      });
    });
    for (const [k, v] of Object.entries(grouped)) {
      result.push({ startWith: k, animeList: v });
    }
    result.sort((a, b) => a.startWith.localeCompare(b.startWith));
  }

  return { list: result };
}

/** Jadwal rilis mingguan */
async function getSchedule() {
  const html = await get('/jadwal-rilis/');
  const $    = cheerio.load(html);
  const days = [];

  // Format umum: .schedule-day / .scheduday > h2 + ul
  const daySelectors = '.scheduday, .schhead, .schedule-day, .daysec';

  $(daySelectors).each((_, dayEl) => {
    const dayName    = $(dayEl).find('h2, h3, .day-name').first().text().trim();
    const animeItems = [];

    $(dayEl).find('li, .scheduleitem').each((__, item) => {
      const a       = $(item).find('a').first();
      const href    = a.attr('href') || '';
      const animeId = slugFromUrl(href);
      const title   = a.text().trim() || $(item).find('.title').text().trim();
      const poster  = $(item).find('img').attr('src') || '';
      const type    = $(item).find('.typez, .type').text().trim() || null;
      const score   = $(item).find('.num, .score').text().replace(/[^0-9.]/g, '') || '';
      const time    = $(item).find('.time, .estimation').text().trim() || null;
      const genres  = [];
      $(item).find('.genxed a').each((___, g) => {
        const gt = $(g).text().trim();
        if (gt) genres.push(gt);
      });

      if (title && animeId) {
        animeItems.push({
          title, poster, type, score,
          estimation   : time,
          genres       : genres.join(', ') || null,
          animeId,
          href         : `/samehadaku/anime/${animeId}`,
          samehadakuUrl: href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
        });
      }
    });

    if (dayName) days.push({ day: dayName, animeList: animeItems });
  });

  // Fallback jika selector tidak match
  if (!days.length) {
    const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    DAY_NAMES.forEach((d) => {
      const $section = $(`*:contains("${d}")`).filter((_, el) => {
        return $(el).children().length && $(el).text().trim().startsWith(d);
      }).last();
      if ($section.length) {
        // Ambil sibling list
        const animeItems = [];
        $section.next('ul, .list').find('li a').each((_, a) => {
          const href  = $(a).attr('href') || '';
          const title = $(a).text().trim();
          const id    = slugFromUrl(href);
          if (title && id) animeItems.push({ title, animeId: id, href: `/samehadaku/anime/${id}`, samehadakuUrl: `${getBaseUrl()}${href}` });
        });
        days.push({ day: d, animeList: animeItems });
      }
    });
  }

  return { days };
}

/** Daftar semua genre */
async function getAllGenres() {
  const html    = await get('/genre/');
  const $       = cheerio.load(html);
  const genres  = [];

  $('a[href*="/genre/"]').each((_, el) => {
    const href    = $(el).attr('href') || '';
    const genreId = slugFromUrl(href);
    const title   = $(el).text().trim();
    if (title && genreId && genreId !== 'genre') {
      genres.push({
        title, genreId,
        href          : `/samehadaku/genres/${genreId}`,
        samehadakuUrl : href.startsWith('http') ? href : `${getBaseUrl()}${href}`,
      });
    }
  });

  return { genres: [...new Map(genres.map((g) => [g.genreId, g])).values()] };
}

/** Anime berdasarkan genre */
async function getByGenre(genreId, { page = 1 } = {}) {
  const path = page > 1
    ? `/genre/${genreId}/page/${page}/`
    : `/genre/${genreId}/`;
  const html   = await get(path);
  const result = parseListingPage(html);
  return result;
}

/** Daftar batch (download) */
async function getBatchList({ page = 1 } = {}) {
  const path = page > 1 ? `/batch/page/${page}/` : '/batch/';
  const html = await get(path);
  const { animeList, currentPage, totalPages } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), currentPage, totalPages };
}

/** Pencarian anime */
async function search({ q, page = 1 } = {}) {
  const params = { s: q };
  if (page > 1) params.page = page;
  const html = await get('/', params);
  const { animeList } = parseListingPage(html);
  return { animeList: animeList.map(normalizeAnimeItem), keyword: q };
}

/** Detail anime */
async function getAnimeDetail(animeId) {
  const html = await get(`/anime/${animeId}/`);
  return normalizeAnimeItem(parseDetailPage(html, animeId));
}

/** Detail episode */
async function getEpisode(episodeId) {
  const html = await get(`/${episodeId}/`);
  return normalizeEpisodeItem(parseEpisodePage(html, episodeId));
}

/** Detail batch (sama dengan getEpisode) */
async function getBatch(batchId) {
  const html = await get(`/${batchId}/`);
  return normalizeEpisodeItem(parseEpisodePage(html, batchId));
}

/** Server embed — dikembalikan tanpa scraping khusus */
async function getServer(serverId) {
  const html = await get('/', { server: serverId });
  const $ = cheerio.load(html);

  const iframeUrl = $('iframe').map((_, el) => $(el).attr('src')).get().find((url) => {
    return url && !/facebook\.com\/plugins\/like|googleads|doubleclick/i.test(url);
  });

  if (iframeUrl) {
    return { serverId, url: iframeUrl };
  }

  const externalUrl = $('a[href]').map((_, el) => $(el).attr('href')).get().find((url) => {
    if (!url || !/^https?:\/\//i.test(url)) {
      return false;
    }

    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {
      return false;
    }

    return url
      && !/samehadaku/i.test(hostname)
      && !/facebook|twitter|x\.com|instagram|telegram|whatsapp|linktr\.ee|mailto:|t\.me\//i.test(url);
  });

  if (externalUrl) {
    return { serverId, url: externalUrl };
  }

  throw new Error(`Unable to resolve samehadaku server URL for ${serverId}`);
}

/** Home page — ambil recent + beberapa featured */
async function getHome() {
  const recent = await getRecent();

  return {
    recent: {
      href: '/samehadaku/recent',
      samehadakuUrl: `${getBaseUrl()}/anime-terbaru/`,
      animeList: recent.animeList,
    },
  };
}

module.exports = {
  getHome,
  getRecent,
  getOngoing,
  getCompleted,
  getPopular,
  getMovies,
  getList,
  getSchedule,
  getAllGenres,
  getByGenre,
  getBatchList,
  search,
  getAnimeDetail,
  getEpisode,
  getBatch,
  getServer,
};
