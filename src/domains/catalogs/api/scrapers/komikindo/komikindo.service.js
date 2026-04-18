'use strict';

/**
 * Komikindo Scraper Service
 * Source: https://komikindo.ch
 * Theme: Classic Indonesian Manga Theme — IDENTICAL to BacaKomik (.animepost selectors)
 *
 * Endpoints:
 *   latest   GET /comic/komikindo/latest/:page
 *   detail   GET /comic/komikindo/detail/:slug
 *   chapter  GET /comic/komikindo/chapter/:slug
 *   library  GET /comic/komikindo/library?page=
 *   genres   GET /comic/komikindo/genres
 *   search   GET /comic/komikindo/search/:query/:page
 *   config   GET /comic/komikindo/config
 *   list     GET /comic/komikindo/list
 *   populer  GET /comic/komikindo/populer/:page
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, resolveImage, slugFromUrl, parseIntText, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://komikindo.ch';
const http = createHttpClient(BASE_URL, { Referer: 'https://komikindo.ch/' });

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('.entry-title, h2, .tt h2, .sinfo .tt h2').first().text()) ||
                clean($a.attr('title') || '');
  const cover = resolveImage($, $el.find('.entry-thumb img, .limit img').first(), BASE_URL);
  const chapter = clean($el.find('.epz a, .epxs, .statustbl .status').first().text());
  const type    = clean($el.find('span[class*="type"], .type').first().text());
  const date    = clean($el.find('.datem, .time').first().text());
  return { title, slug, cover, chapter, type, date, link: href };
};

const latest = async (page = 1) => {
  const $ = await getPage(`/page/${page}/`);
  const items = [];
  $('.animepost, .listupd .animepost, .film-list .animepost').each((_, el) =>
    items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const library = async (page = 1) => {
  const $ = await getPage('/daftar-komik/', { page });
  const items = [];
  $('.animepost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const populer = async (page = 1) => {
  const $ = await getPage('/popular/', { page });
  const items = [];
  $('.animepost, .film-info').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const list = async () => {
  const $ = await getPage('/comic-list/');
  const items = [];
  $('ul.clstyle li, .animepost').each((_, el) => {
    const $el  = $(el);
    const $a   = $el.find('a').first();
    const href = $a.attr('href') || '';
    const slug = slugFromUrl(href);
    const title = clean($a.text()) || clean($el.find('.name').first().text());
    if (title && slug) items.push({ title, slug, link: href });
  });
  return { komikList: items };
};

const config = async () => {
  const $ = await getPage('/');
  /* Extract genre list and any site config visible on homepage */
  const genreList = [];
  $('a[href*="/komik-genre/"], a[href*="/genre/"]').each((_, el) => {
    const href  = $(el).attr('href') || '';
    const title = clean($(el).text());
    const slug  = slugFromUrl(href);
    if (title && slug && !genreList.find(g => g.slug === slug))
      genreList.push({ title, slug });
  });
  return { genres: genreList };
};

const genres = async () => {
  const $ = await getPage('/genre/');
  const items = [];
  $('.genreitem a, .genre-list a, a[href*="/komik-genre/"]').each((_, el) => {
    const href  = $(el).attr('href') || '';
    const title = clean($(el).text());
    const slug  = slugFromUrl(href);
    if (title && slug && !items.find(g => g.slug === slug))
      items.push({ title, slug });
  });
  return { genres: items };
};

const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('.animepost, article').each((_, el) => items.push(parseCard($, el)));
  return { query, komikList: items, pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const $ = await getPage(`/komik/${slug}/`);
  const title     = clean($('.entry-title, h1.series-title').first().text());
  const $thumb    = $('.thumb img, .wp-post-image, .entry-thumb img').first();
  const cover     = resolveImage($, $thumb, BASE_URL);
  const synopsis  = clean($('.entry-content p, .synops p').first().text());
  const rating    = clean($('.ratingmanga, .rating, #sidebar-rating').first().text());

  const info = {};
  $('.infox .spe span, .tsinfo .imptdt').each((_, el) => {
    const text = $(el).text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = clean(parts[0]).toLowerCase().replace(/\s+/g, '_');
      const val = clean(parts.slice(1).join(':'));
      if (key && val) info[key] = val;
    }
  });

  const genreList = [];
  $('a[href*="/komik-genre/"], a[href*="/genre/"]').each((_, el) => {
    genreList.push({ title: clean($(el).text()), slug: slugFromUrl($(el).attr('href') || '') });
  });

  const chapters = [];
  $('#chapterlist li, .wp-manga-chapter').each((_, el) => {
    const $a    = $(el).find('a').first();
    const href  = $a.attr('href') || '';
    const cSlug = slugFromUrl(href);
    const cTitle = clean($a.text()) || clean($(el).find('.chapternum').first().text());
    const cDate  = clean($(el).find('.chapterdate, .chapter-release-date').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate });
  });

  return { detail: { title, cover, synopsis, rating, info, genres: genreList, chapters } };
};

const chapter = async (slug) => {
  const $ = await getPage(`/${slug}/`);
  const title  = clean($('h1, .title, title').first().text());
  const images = [];
  $('#readerarea img, .reader-area img, .separator img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder') && !src.includes('blank'))
      images.push(src.trim());
  });
  return { title, images };
};

module.exports = { latest, detail, chapter, library, genres, search, config, list, populer };
