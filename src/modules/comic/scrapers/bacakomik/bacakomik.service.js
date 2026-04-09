'use strict';

/**
 * BacaKomik Scraper Service
 * Source: https://bacakomik.my
 * Theme: Classic Indonesian Manga Theme (Anime/Ubbiz variant)
 *
 * Endpoints:
 *   latest     GET /comic/bacakomik/latest?page=
 *   populer    GET /comic/bacakomik/populer
 *   top        GET /comic/bacakomik/top
 *   list       GET /comic/bacakomik/list?page=
 *   search     GET /comic/bacakomik/search/:query?page=
 *   genres     GET /comic/bacakomik/genres
 *   genre      GET /comic/bacakomik/genre/:genre?page=
 *   only       GET /comic/bacakomik/only/:type?page=
 *   detail     GET /comic/bacakomik/detail/:slug
 *   chapter    GET /comic/bacakomik/chapter/:slug
 *   berwarna   GET /comic/bacakomik/komikberwarna/:page
 *   recomen    GET /comic/bacakomik/recomen
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, resolveImage, slugFromUrl, clean } = require('../_base/parseHelpers');
const ApiError = require('../../../../shared/errors/ApiError');

const BASE_URL = 'https://bacakomik.my';

const http = createHttpClient(BASE_URL, {
  Referer: 'https://bacakomik.my/',
  'X-Requested-With': 'XMLHttpRequest',
});

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

// ── Parsers ──────────────────────────────────────────────────────────────────

/** Parse one comic card in list (.animepost) */
const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('.entry-title, h2, .tt h2').first().text()) ||
                clean($a.attr('title') || '');
  const cover = $el.find('.entry-thumb img, .limit img, .thumbs img').first().attr('src') ||
                $el.find('img').first().attr('src') || null;
  const chapter = clean($el.find('.epz a, .epxs, .epdate, .adds .ep a').first().text());
  const type  = clean($el.find('.typez, .type').first().text());
  const date  = clean($el.find('.epdate, .adds .epdate, .newnime').first().text());
  return { title, slug, cover, chapter, type, date, sourceUrl: href };
};

/** Parse genre/type pill */
const parseGenreLink = ($, el) => {
  const $el   = $(el);
  const href  = $el.attr('href') || '';
  const title = clean($el.text());
  const slug  = slugFromUrl(href);
  return { title, slug };
};

// ── Public API Methods ────────────────────────────────────────────────────────

/** Komik terbaru (halaman berdasarkan page) */
const latest = async (page = 1) => {
  const $ = await getPage('/', { page });
  const items = [];
  $('.animepost, .film-list .animepost, .listupd .animepost').each((_, el) => {
    items.push(parseCard($, el));
  });
  // fallback: generic list
  if (!items.length) {
    $('.listupd > div, .listupd > article').each((_, el) => items.push(parseCard($, el)));
  }
  return { komikList: items, pagination: { currentPage: +page } };
};

/** Komik populer */
const populer = async (page = 1) => {
  const $ = await getPage('/daftar-komik/', { page, order: 'popular' });
  const items = [];
  $('.animepost, .listupd .animepost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

/** Top komik */
const top = async () => {
  const $ = await getPage('/daftar-komik/', { order: 'popular' });
  const items = [];
  $('.animepost, .listupd .animepost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items };
};

/** Daftar semua komik */
const list = async (page = 1) => {
  const $ = await getPage('/daftar-komik/', { page });
  const items = [];
  $('.animepost, .listupd .animepost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

/** Cari komik */
const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('.animepost, .listupd .animepost, article.type-post').each((_, el) => items.push(parseCard($, el)));
  return { query, komikList: items, pagination: { currentPage: +page } };
};

/** Daftar genre */
const genres = async () => {
  const $ = await getPage('/');
  const list = [];
  $('.taxlist a, .taxcate a').each((_, el) => list.push(parseGenreLink($, el)));
  // Alternatively parse genre list from sidebar
  if (!list.length) {
    $('a[href*="/genre/"]').each((_, el) => {
      const item = parseGenreLink($, el);
      if (item.slug) list.push(item);
    });
  }
  return { genres: [...new Map(list.map(g => [g.slug, g])).values()] };
};

/** Komik by genre */
const byGenre = async (genre, page = 1) => {
  const $ = await getPage(`/genre/${genre}/`, { page });
  const items = [];
  $('.animepost, .listupd .animepost').each((_, el) => items.push(parseCard($, el)));
  return { genre, komikList: items, pagination: { currentPage: +page } };
};

/** Filter by type (manga/manhwa/manhua) */
const byType = async (type, page = 1) => {
  const $ = await getPage(`/komik/${type}/`, { page });
  const items = [];
  $('.animepost, .listupd .animepost').each((_, el) => items.push(parseCard($, el)));
  return { type, komikList: items, pagination: { currentPage: +page } };
};

/** Komik berwarna */
const komikBerwarna = async (page = 1) => {
  const $ = await getPage('/daftar-komik/', { page, color: 'colored' });
  const items = [];
  $('.animepost, .listupd .animepost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

/** Rekomendasi */
const recomen = async () => {
  const $ = await getPage('/');
  const items = [];
  $('.widget-post .animepost, .recommended .animepost, .animepost').each((_, el) => {
    items.push(parseCard($, el));
  });
  return { recommendations: items.slice(0, 12) };
};

/** Detail komik */
const detail = async (slug) => {
  const $ = await getPage(`/manga/${slug}/`);
  const title    = clean($('h1.entry-title, h1.title').first().text());
  const cover    = $('.thumb img, .entry-thumb img').first().attr('src') || null;
  const rating   = clean($('.num, .rating-number').first().text()) || null;
  const synopsis = clean($('.entry-content p, .sinopsis p, [itemprop="description"] p').first().text());
  const status   = clean($('.infox .spe span:contains("Status") b, .infox b:contains("Berjalan"), .status').first().text());

  // Info table: iterates .infox .spe span
  const info = {};
  $('.infox .spe span').each((_, el) => {
    const text  = $(el).text().trim();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim().toLowerCase().replace(/\s+/g, '_');
      info[key] = parts.slice(1).join(':').trim();
    }
  });

  const genreList = [];
  $('.infox .genres a, .genre-list a').each((_, el) => genreList.push(parseGenreLink($, el)));

  const chapters = [];
  $('#chapterlist li, .listeps li').each((_, el) => {
    const $li    = $(el);
    const $a     = $li.find('a').first();
    const href   = $a.attr('href') || '';
    const cSlug  = slugFromUrl(href);
    const cTitle = clean($li.find('.chapternum, .chnum').first().text()) ||
                   clean($a.text());
    const cDate  = clean($li.find('.chapterdate, .epdate').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate, url: href });
  });

  return { detail: { title, cover, rating, synopsis, status, info, genres: genreList, chapters } };
};

/** Baca chapter */
const chapter = async (slug) => {
  const $ = await getPage(`/${slug}/`);
  const title = clean($('h1.entry-title, h1.post-title, title').first().text());
  const images = [];
  $('#readerarea img, .chapter-single img, .content-image img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder')) images.push(src);
  });
  const prev = $('a.prev_page, a[rel="prev"]').attr('href') || null;
  const next = $('a.next_page, a[rel="next"]').attr('href') || null;
  return { title, images, navigation: { prev, next } };
};

module.exports = { latest, populer, top, list, search, genres, byGenre, byType, komikBerwarna, recomen, detail, chapter };
