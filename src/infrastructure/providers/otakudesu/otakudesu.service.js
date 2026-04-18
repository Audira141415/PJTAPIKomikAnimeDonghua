'use strict';

const axios    = require('axios');
const cheerio  = require('cheerio');
const ApiError = require('@core/errors/ApiError');

const BASE_URL    = 'https://otakudesu.blog';
const API_PREFIX  = '/anime';

// ── HTTP client ───────────────────────────────────────────────────────────────
const http = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  },
});

/** Fetch HTML → return loaded Cheerio instance */
const getPage = async (path) => {
  const { data } = await http.get(path);
  return cheerio.load(data);
};

/** Extract animeId (slug) from a full Otakudesu URL */
const extractAnimeId = (url = '') =>
  url.replace(/\/$/, '').split('/').pop();

/** Build internal href: "/anime/anime/:animeId" */
const animeHref = (animeId) => `${API_PREFIX}/anime/${animeId}`;

/** Encode raw server nonce to URL-safe token */
const encodeServerId = (raw = '') => raw
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/g, '');

/** Decode URL-safe token to raw server nonce */
const decodeServerId = (token = '') => {
  if (!token) return '';
  // If token has no URL-safe substitutions, keep it unchanged.
  if (!token.includes('-') && !token.includes('_')) return token;

  let raw = token.replace(/-/g, '+').replace(/_/g, '/');
  while (raw.length % 4 !== 0) raw += '=';
  return raw;
};

// ── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Pick the best image URL: prefer src, fallback to first URL in srcset.
 * Otakudesu sets src to a small thumb; srcset has the larger variant.
 */
const bestImage = ($el) => {
  const img   = $el.find('img').first();
  const src   = img.attr('src') || '';
  // srcset = "url1 225w, url2 212w" — take the first entry
  const srcset = img.attr('srcset') || '';
  const first  = srcset.split(',')[0]?.trim().split(' ')[0] || '';
  return src || first || null;
};

/** Parse one ongoing card (.detpost) → object */
const parseOngoingCard = ($, el) => {
  const $el      = $(el).hasClass('detpost') ? $(el) : $(el).find('.detpost');
  const title    = $el.find('h2.jdlflm').text().trim();
  const poster   = bestImage($el);
  const otakuUrl = $el.find('a').first().attr('href') || '';
  const animeId  = extractAnimeId(otakuUrl);

  // ".epz" → "Episode 1" or "1 Episode"
  const epsText  = $el.find('.epz').text().trim();
  const episodes = parseInt(epsText.replace(/\D/g, ''), 10) || 0;

  // ".epztipe" → " Selasa" (has a <i> icon, trim it)
  const releaseDay       = $el.find('.epztipe').text().trim() || 'None';
  // ".newnime"  → "07 Apr"
  const latestReleaseDate = $el.find('.newnime').text().trim();

  return {
    title,
    poster,
    episodes,
    releaseDay,
    latestReleaseDate,
    animeId,
    href: animeHref(animeId),
    otakudesuUrl: otakuUrl,
  };
};

/** Parse one completed card (.detpost) → object */
const parseCompletedCard = ($, el) => {
  const $el      = $(el).hasClass('detpost') ? $(el) : $(el).find('.detpost');
  const title    = $el.find('h2.jdlflm').text().trim();
  const poster   = bestImage($el);
  const otakuUrl = $el.find('a').first().attr('href') || '';
  const animeId  = extractAnimeId(otakuUrl);

  // ".epz" → "13 Episode"
  const epsText  = $el.find('.epz').text().trim();
  const episodes = parseInt(epsText.replace(/\D/g, ''), 10) || 0;

  // ".epztipe" → " 6.36" (score)
  const score           = $el.find('.epztipe').text().trim() || null;
  const lastReleaseDate = $el.find('.newnime').text().trim();

  return {
    title,
    poster,
    episodes,
    score,
    lastReleaseDate,
    animeId,
    href: animeHref(animeId),
    otakudesuUrl: otakuUrl,
  };
};

// ── Service Functions ─────────────────────────────────────────────────────────

const getHome = async () => {
  const $ = await getPage('/');

  // Home page has exactly 2 .venz containers:
  //   eq(0) → ongoing  (15 items), .epztipe = day name
  //   eq(1) → completed (10 items), .epztipe = score
  const ongoingList   = [];
  const completedList = [];

  $('div.venz').eq(0).find('ul li').each((_, el) => {
    const item = parseOngoingCard($, el);
    if (item.animeId) ongoingList.push(item);
  });

  $('div.venz').eq(1).find('ul li').each((_, el) => {
    const item = parseCompletedCard($, el);
    if (item.animeId) completedList.push(item);
  });

  return {
    ongoing: {
      href: `${API_PREFIX}/ongoing-anime`,
      otakudesuUrl: `${BASE_URL}/ongoing-anime/`,
      animeList: ongoingList,
    },
    completed: {
      href: `${API_PREFIX}/complete-anime`,
      otakudesuUrl: `${BASE_URL}/complete-anime/`,
      animeList: completedList,
    },
  };
};

const getSchedule = async () => {
  const $ = await getPage('/jadwal-rilis/');

  // Each day is wrapped in a div.kglist321; h2 = day name, ul li a = anime items
  const data = [];

  $('.kglist321').each((_, section) => {
    const day        = $(section).find('h2').text().trim();
    const anime_list = [];

    $(section).find('ul li a').each((__, a) => {
      const href = $(a).attr('href') || '';
      const slug = extractAnimeId(href);
      anime_list.push({
        title:  $(a).text().trim(),
        slug,
        url:    animeHref(slug),
        poster: null,
      });
    });

    if (day) data.push({ day, anime_list });
  });

  return { data };
};

const getCompleteAnime = async ({ page = 1 } = {}) => {
  const normalizedPage = Math.max(1, Math.trunc(Number(page) || 1));
  const path = normalizedPage > 1 ? `/complete-anime/page/${normalizedPage}/` : '/complete-anime/';
  const $ = await getPage(path);

  const animeList = [];
  $('.venz ul li').each((_, el) => {
    const item = parseCompletedCard($, el);
    if (item.animeId) animeList.push(item);
  });

  const currentPage = normalizedPage;

  const paginationText = $('.pagenavix a, .pagination a, a.page-numbers')
    .map((_, el) => $(el).text().trim())
    .get();

  const numericPages = paginationText
    .map((text) => parseInt(text, 10))
    .filter((n) => Number.isInteger(n));

  const totalPages = numericPages.length ? Math.max(...numericPages, currentPage) : currentPage;
  const hasPrevPage = currentPage > 1;
  const hasNextPage = paginationText.some((text) => /berikutnya|next/i.test(text)) || currentPage < totalPages;

  return {
    animeList,
    pagination: {
      currentPage,
      hasPrevPage,
      prevPage: hasPrevPage ? currentPage - 1 : null,
      hasNextPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      totalPages,
    },
  };
};

const getOngoingAnime = async ({ page = 1 } = {}) => {
  const normalizedPage = Math.max(1, Math.trunc(Number(page) || 1));
  const path = normalizedPage > 1 ? `/ongoing-anime/page/${normalizedPage}/` : '/ongoing-anime/';
  const $ = await getPage(path);

  const animeList = [];
  $('.venz ul li').each((_, el) => {
    const item = parseOngoingCard($, el);
    if (item.animeId) animeList.push(item);
  });

  const currentPage = normalizedPage;
  const paginationText = $('.pagenavix a, .pagination a, a.page-numbers')
    .map((_, el) => $(el).text().trim())
    .get();

  const numericPages = paginationText
    .map((text) => parseInt(text, 10))
    .filter((n) => Number.isInteger(n));

  const totalPages = numericPages.length ? Math.max(...numericPages, currentPage) : currentPage;
  const hasPrevPage = currentPage > 1;
  const hasNextPage = paginationText.some((text) => /berikutnya|next/i.test(text)) || currentPage < totalPages;

  return {
    animeList,
    pagination: {
      currentPage,
      hasPrevPage,
      prevPage: hasPrevPage ? currentPage - 1 : null,
      hasNextPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      totalPages,
    },
  };
};

const getAllGenres = async () => {
  const $ = await getPage('/genre-list/');

  const genreList = [];
  const seen = new Set();

  // Prefer primary genre container, fallback to broader scoped search if missing
  const $genreLinks = $('.genres a').length
    ? $('.genres a')
    : $('.venser a[href*="/genres/"]');

  $genreLinks.each((_, el) => {
    const $el = $(el);
    const rawHref = $el.attr('href') || '';
    const parsed = new URL(rawHref, BASE_URL);
    const href = parsed.toString();
    const parts = parsed.pathname.replace(/\/+$/, '').split('/');
    const genresIdx = parts.indexOf('genres');
    const genreId = genresIdx >= 0 ? parts[genresIdx + 1] : '';
    if (!genreId || seen.has(genreId)) return;
    seen.add(genreId);

    genreList.push({
      title: $el.text().trim(),
      genreId,
      href: `${API_PREFIX}/genre/${genreId}`,
      otakudesuUrl: href,
    });
  });

  return { genreList };
};

const getByGenre = async (slug, { page = 1 } = {}) => {
  const normalizedPage = Math.max(1, Math.trunc(Number(page) || 1));
  const path = normalizedPage > 1
    ? `/genres/${slug}/page/${normalizedPage}/`
    : `/genres/${slug}/`;
  const $ = await getPage(path);

  const animeList = [];
  $('.col-anime-con .col-anime').each((_, el) => {
    const $el = $(el);
    const otakuUrlRaw = $el.find('.col-anime-title a').attr('href') || $el.find('a').first().attr('href') || '';
    const otakuUrl = otakuUrlRaw.startsWith('http')
      ? otakuUrlRaw
      : `${BASE_URL}${otakuUrlRaw.startsWith('/') ? '' : '/'}${otakuUrlRaw}`;

    const animeId = extractAnimeId(otakuUrl);
    if (!animeId) return;

    const title = $el.find('.col-anime-title').text().trim();
    const poster = $el.find('.col-anime-cover img').attr('src') || $el.find('img').attr('src') || null;
    const studios = $el.find('.col-anime-studio').text().trim() || '';
    const score = $el.find('.col-anime-rating').text().trim() || '';
    const season = $el.find('.col-anime-date').text().trim() || '';

    const epsText = $el.find('.col-anime-eps').text().trim();
    const episodes = /\d+/.test(epsText) ? parseInt(epsText, 10) : null;

    const synopsisParagraphs = $el.find('.col-synopsis p')
      .map((__, p) => $(p).text().replace(/\u00a0/g, ' ').trim())
      .get()
      .filter(Boolean);

    const genreList = $el.find('.col-anime-genre a').map((__, a) => {
      const raw = $(a).attr('href') || '';
      const full = raw.startsWith('http') ? raw : `${BASE_URL}${raw.startsWith('/') ? '' : '/'}${raw}`;
      const genreId = full.replace(/\/$/, '').split('/genres/').pop().split('/').shift();
      return {
        title: $(a).text().trim(),
        genreId,
        href: `${API_PREFIX}/genre/${genreId}`,
        otakudesuUrl: full,
      };
    }).get().filter((g) => g.genreId);

    animeList.push({
      title,
      poster,
      studios,
      score,
      episodes,
      season,
      animeId,
      href: animeHref(animeId),
      otakudesuUrl: otakuUrl,
      synopsis: { paragraphs: synopsisParagraphs },
      genreList,
    });
  });

  const currentPage = normalizedPage;
  const paginationText = $('.pagenavix a, .pagination a, a.page-numbers')
    .map((_, item) => $(item).text().trim())
    .get();
  const numericPages = paginationText
    .map((text) => parseInt(text, 10))
    .filter((n) => Number.isInteger(n));

  const totalPages = numericPages.length ? Math.max(...numericPages, currentPage) : currentPage;
  const hasPrevPage = currentPage > 1;
  const hasNextPage = paginationText.some((text) => /berikutnya|next/i.test(text)) || currentPage < totalPages;

  return {
    animeList,
    pagination: {
      currentPage,
      hasPrevPage,
      prevPage: hasPrevPage ? currentPage - 1 : null,
      hasNextPage,
      nextPage: hasNextPage ? currentPage + 1 : null,
      totalPages,
    },
  };
};

const searchAnime = async (keyword) => {
  const $ = await getPage(`/?s=${encodeURIComponent(keyword)}&post_type=anime`);

  const animeList = [];

  $('ul.chivsrc li').each((_, el) => {
    const $el      = $(el);
    const $link    = $el.find('h2 a').first();
    const otakuUrl = $link.attr('href') || '';
    const animeId  = extractAnimeId(otakuUrl);
    const title    = $link.text().trim();
    const poster   = $el.find('img').attr('src') || $el.find('img').attr('data-src') || null;

    // Extract value from .set div by its <b> label
    const setVal = (label) =>
      $el.find('.set').filter((__, s) => $(s).find('b').first().text().trim() === label)
        .text().replace(new RegExp(`${label}\\s*:\\s*`, 'i'), '').trim() || null;

    const status = setVal('Status');
    const score  = setVal('Rating');

    const genreList = [];
    $el.find('.set')
      .filter((__, s) => $(s).find('b').first().text().trim() === 'Genres')
      .find('a')
      .each((__, g) => {
        const rawHref = $(g).attr('href') || '';
        const genreId = extractAnimeId(rawHref);
        genreList.push({
          title: $(g).text().trim(),
          genreId,
          href: `${API_PREFIX}/genre/${genreId}`,
          otakudesuUrl: rawHref,
        });
      });

    if (animeId) {
      animeList.push({ title, poster, status, score, animeId, href: animeHref(animeId), otakudesuUrl: otakuUrl, genreList });
    }
  });

  return { animeList };
};

const getEpisodeDetail = async (slug) => {
  const $ = await getPage(`/episode/${slug}/`);

  const title = $('h1.posttl, h1.entry-title, h1').first().text().trim();
  const animeUrl = $('.prevnext a[href*="/anime/"]').first().attr('href') || $('a[href*="/anime/"]').first().attr('href') || '';
  const animeId = extractAnimeId(animeUrl);

  if (!title || !animeId || !$('.mirrorstream').length) {
    throw new Error('Episode not found');
  }

  const releaseTime = $('.kategoz span').filter((_, el) => $(el).text().includes('Release on')).first().text().trim() || '';
  const defaultStreamingUrl = $('iframe').first().attr('src') || null;

  let prevHref = $('.prevnext a[title*="Sebelumnya"], .prevnext a:contains("Previous"), .prevnext a:contains("Sebelumnya")').first().attr('href') || null;
  let nextHref = $('.prevnext a[title*="Selanjutnya"], .prevnext a:contains("Next"), .prevnext a:contains("Selanjutnya")').first().attr('href') || null;

  if (!prevHref || !nextHref) {
    const epLinks = $('.prevnext a[href*="/episode/"]');
    if (!prevHref) prevHref = epLinks.first().attr('href') || null;
    if (!nextHref) nextHref = epLinks.last().attr('href') || null;
  }

  const prevEpisode = prevHref ? {
    title: 'Prev',
    episodeId: extractAnimeId(prevHref),
    href: `${API_PREFIX}/episode/${extractAnimeId(prevHref)}`,
    otakudesuUrl: prevHref,
  } : null;

  const nextEpisode = nextHref ? {
    title: 'Next',
    episodeId: extractAnimeId(nextHref),
    href: `${API_PREFIX}/episode/${extractAnimeId(nextHref)}`,
    otakudesuUrl: nextHref,
  } : null;

  const serverQualities = [];
  $('.mirrorstream ul').each((_, ul) => {
    const qualityText = $(ul).clone().children('li').remove().end().text().trim();
    const qualityMatch = qualityText.match(/(\d{3,4}p)/i);
    const qualityTitle = qualityMatch ? qualityMatch[1].toLowerCase() : qualityText.replace(/Mirror/i, '').trim();

    const serverList = $(ul).find('li a').map((__, a) => {
      const rawServerId = $(a).attr('data-content') || '';
      if (!rawServerId) return null;
      const serverId = encodeServerId(rawServerId);
      return {
        title: $(a).text().trim(),
        serverId,
        href: `${API_PREFIX}/server/${serverId}`,
      };
    }).get().filter(Boolean);

    serverQualities.push({
      title: qualityTitle,
      serverList,
    });
  });

  const downloadQualities = $('.download ul li').map((_, li) => {
    const $li = $(li);
    const title = $li.find('strong').first().text().trim() || '';
    const size = $li.find('i').first().text().trim() || '';
    const urls = $li.find('a').map((__, a) => ({
      title: $(a).text().trim(),
      url: $(a).attr('href') || '',
    })).get();
    return { title, size, urls };
  }).get().filter((q) => q.title);

  const infoField = (label) => {
    const $b = $(`.infozingle b:contains("${label}")`).first();
    if (!$b.length) return '';
    return $b.parent().text().replace(label, '').replace(/^[:\s]+/, '').trim();
  };

  const infoGenreList = $('.infozingle p:has(b:contains("Genres")) a').map((_, a) => {
    const href = $(a).attr('href') || '';
    const genreId = href.replace(/\/$/, '').split('/genres/').pop().split('/').shift();
    return {
      title: $(a).text().trim(),
      genreId,
      href: `${API_PREFIX}/genre/${genreId}`,
      otakudesuUrl: href,
    };
  }).get().filter((g) => g.genreId);

  const infoEpisodeList = [];
  if (animeUrl) {
    const $$ = await getPage(animeUrl.replace(BASE_URL, ''));
    $$('.episodelist').each((_, listEl) => {
      const monktit = $$(listEl).find('.monktit').text().toLowerCase();
      if (!monktit.includes('episode list')) return;

      $$(listEl).find('ul li').each((__, li) => {
        const $li = $$(li);
        const $a = $li.find('a').first();
        const epUrl = $a.attr('href') || '';
        const episodeId = extractAnimeId(epUrl);
        const titleText = $a.text().trim();
        const epsMatch = titleText.match(/Episode\s+(\d+)/i);
        const eps = epsMatch ? parseInt(epsMatch[1], 10) : null;

        if (!episodeId) return;
        infoEpisodeList.push({
          title: `Episode ${eps || ''}`.trim(),
          eps,
          date: $li.find('.zeebr').text().trim() || '',
          episodeId,
          href: `${API_PREFIX}/episode/${episodeId}`,
          otakudesuUrl: epUrl,
        });
      });
    });
  }

  return {
    title,
    animeId,
    releaseTime,
    defaultStreamingUrl,
    hasPrevEpisode: Boolean(prevEpisode),
    prevEpisode,
    hasNextEpisode: Boolean(nextEpisode),
    nextEpisode,
    server: {
      qualities: serverQualities,
    },
    downloadUrl: {
      qualities: downloadQualities,
    },
    info: {
      credit: infoField('Credit'),
      encoder: infoField('Encoder'),
      duration: infoField('Duration'),
      type: infoField('Tipe'),
      genreList: infoGenreList,
      episodeList: infoEpisodeList,
    },
  };
};

const getBatch = async (slug) => {
  const $ = await getPage(`/batch/${slug}/`);

  const title  = $('h1.entry-title').text().trim();
  const poster = $('.thumbimage img, .ims img').attr('src') || null;

  const batchLinks = [];
  $('.batchlink ul, .download ul').each((_, section) => {
    const resolution = $(section).find('strong, .res').text().trim() || null;
    const links = [];
    $(section).find('li a, a').each((__, a) => {
      links.push({
        server: $(a).text().trim(),
        url:    $(a).attr('href') || '',
      });
    });
    if (links.length) batchLinks.push({ resolution, links });
  });

  return {
    title,
    poster,
    slug,
    otakudesuUrl: `${BASE_URL}/batch/${slug}/`,
    batchLinks,
  };
};

const getStreamServer = async (serverId) => {
  const decodedServerId = decodeServerId(serverId);

  let streamPayload;
  try {
    const json = Buffer.from(decodedServerId, 'base64').toString('utf8');
    streamPayload = JSON.parse(json);
  } catch {
    streamPayload = null;
  }

  if (!streamPayload || typeof streamPayload !== 'object' || Array.isArray(streamPayload)) {
    throw new ApiError(404, 'data tidak ditemukan');
  }

  const hasKeys = Object.prototype.hasOwnProperty.call(streamPayload, 'id')
    && Object.prototype.hasOwnProperty.call(streamPayload, 'i')
    && Object.prototype.hasOwnProperty.call(streamPayload, 'q');

  if (!hasKeys) {
    throw new ApiError(404, 'data tidak ditemukan');
  }

  const safePayload = {
    id: streamPayload.id,
    i: streamPayload.i,
    q: streamPayload.q,
  };

  let embedUrl = null;
  try {
    // Step 1: fetch nonce token
    const nonceRes = await http.post(
      '/wp-admin/admin-ajax.php',
      new URLSearchParams({ action: 'aa1208d27f29ca340c92c66d1926f13f' }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const nonce = nonceRes?.data?.data || nonceRes?.data || '';

    // Step 2: resolve mirror stream HTML (base64)
    const streamRes = await http.post(
      '/wp-admin/admin-ajax.php',
      new URLSearchParams({
        ...safePayload,
        nonce,
        action: '2a3505c93b0035d3f455df82bf976b84',
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const encodedHtml = streamRes?.data?.data || streamRes?.data || '';
    const html = Buffer.from(String(encodedHtml), 'base64').toString('utf8');
    const $$ = cheerio.load(html);
    embedUrl = $$('iframe').first().attr('src') || null;
  } catch {
    embedUrl = null;
  }

  if (!embedUrl) {
    throw new ApiError(404, 'data tidak ditemukan');
  }

  return { serverId, embedUrl };
};

const getAllAnime = async () => {
  const $ = await getPage('/anime-list/');

  const list = [];

  $('.bariskelom').each((_, groupEl) => {
    const $group = $(groupEl);
    const startWith = $group.find('.barispenz a').first().attr('name') || $group.find('.barispenz').first().text().trim();

    const animeList = $group.find('.jdlbar li a[href*="/anime/"]').map((__, linkEl) => {
      const $link = $(linkEl);
      const otakuUrl = $link.attr('href') || '';
      const animeId = extractAnimeId(otakuUrl);
      const title = $link.clone().children().remove().end().text().trim();

      if (!animeId || !title) return null;

      return {
        title,
        animeId,
        href: animeHref(animeId),
        otakudesuUrl: otakuUrl,
      };
    }).get().filter(Boolean);

    if (!startWith || animeList.length === 0) return;

    list.push({
      startWith,
      animeList,
    });
  });

  if (list.length === 0) {
    throw new ApiError(502, 'Gagal memuat daftar anime');
  }

  return { list };
};

const getAnimeDetail = async (slug) => {
  const $ = await getPage(`/anime/${slug}/`);

  // ── Basic info ───────────────────────────────────────────────────────────
  const title  = $('h1').first().text().trim();
  const poster = $('.fotoanime img').attr('src') || null;

  // Helper: pull text value of an info row by its Indonesian label
  const infoField = (label) => {
    const $b = $(`b:contains("${label}")`).first();
    if (!$b.length) return null;
    return $b.parent().text().replace(label, '').replace(/^[:\s]+/, '').trim() || null;
  };

  const japanese  = infoField('Japanese');
  const score     = infoField('Skor');
  const producers = infoField('Produser') || '';
  const type      = infoField('Tipe');
  const status    = infoField('Status');
  const epsRaw    = infoField('Total Episode');
  const episodes  = epsRaw && /\d/.test(epsRaw) ? parseInt(epsRaw, 10) : null;
  const duration  = infoField('Durasi');
  const aired     = infoField('Tanggal Rilis');
  const studios   = infoField('Studio') || '';

  // ── Synopsis (.sinopc) ───────────────────────────────────────────────────
  const paragraphs  = [];
  const connections = [];
  $('.sinopc p').each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
    $(el).find('a[href*="/anime/"]').each((__, a) => {
      const href    = $(a).attr('href') || '';
      const animeId = extractAnimeId(href);
      if (animeId) {
        connections.push({
          title: $(a).text().trim(),
          animeId,
          href:  animeHref(animeId),
          otakudesuUrl: href,
        });
      }
    });
  });

  // ── Genre list ───────────────────────────────────────────────────────────
  const genreList = [];
  $('b:contains("Genre")').first().parent().find('a').each((_, el) => {
    const url     = $(el).attr('href') || '';
    const genreId = url.replace(/\/$/, '').split('/genres/').pop();
    genreList.push({
      title:   $(el).text().trim(),
      genreId,
      href:    `${API_PREFIX}/genre/${genreId}`,
      otakudesuUrl: url,
    });
  });

  // ── Batch link ───────────────────────────────────────────────────────────
  // First .episodelist is always the batch section
  let batch = null;
  const $first = $('.episodelist').eq(0);
  if ($first.find('.monktit').text().toLowerCase().includes('batch')) {
    const batchurl = $first.find('ul li a').first().attr('href') || null;
    if (batchurl) {
      const batchId = extractAnimeId(batchurl);
      batch = {
        batchId,
        href: `${API_PREFIX}/batch/${batchId}`,
        otakudesuUrl: batchurl,
      };
    }
  }

  // ── Episode list ─────────────────────────────────────────────────────────
  // Second .episodelist has monktit containing "Episode List"
  const episodeList = [];
  $('.episodelist').each((_, listEl) => {
    const monktit = $(listEl).find('.monktit').text().toLowerCase();
    if (!monktit.includes('episode list') && !monktit.includes('episode')) return;
    if (monktit.includes('batch') || monktit.includes('lengkap')) return;

    $(listEl).find('ul li').each((__, li) => {
      const $li       = $(li);
      const $a        = $li.find('a').first();
      const epUrl     = $a.attr('href') || '';
      const episodeId = extractAnimeId(epUrl);
      const epTitle   = $a.text().trim();
      const date      = $li.find('.zeebr').text().trim() || null;

      // Parse episode number from "... Episode 13 ..."
      const epsMatch = epTitle.match(/Episode\s+(\d+)/i);
      const eps      = epsMatch ? parseInt(epsMatch[1], 10) : null;

      if (episodeId) {
        episodeList.push({
          title: epTitle,
          eps,
          date,
          episodeId,
          href: `${API_PREFIX}/episode/${episodeId}`,
          otakudesuUrl: epUrl,
        });
      }
    });
  });

  // ── Recommended anime ────────────────────────────────────────────────────
  const recommendedAnimeList = [];
  $('#recommend-anime-series .isi-anime').each((_, el) => {
    const $el      = $(el);
    const $label   = $el.find('span.judul-anime a').first();
    const otakuUrl = $label.attr('href') || $el.find('a').first().attr('href') || '';
    const animeId  = extractAnimeId(otakuUrl);
    const recTitle = $label.text().trim();
    const recPoster = $el.find('img').first().attr('src') || null;
    if (animeId) {
      recommendedAnimeList.push({
        title:  recTitle,
        poster: recPoster,
        animeId,
        href: animeHref(animeId),
        otakudesuUrl: otakuUrl,
      });
    }
  });

  return {
    title,
    poster,
    japanese,
    score,
    producers,
    type,
    status,
    episodes,
    duration,
    aired,
    studios,
    batch,
    synopsis: { paragraphs, connections },
    genreList,
    episodeList,
    recommendedAnimeList,
  };
};

module.exports = {
  getHome,
  getSchedule,
  getCompleteAnime,
  getOngoingAnime,
  getAllGenres,
  getByGenre,
  searchAnime,
  getEpisodeDetail,
  getBatch,
  getStreamServer,
  getAllAnime,
  getAnimeDetail,
};
