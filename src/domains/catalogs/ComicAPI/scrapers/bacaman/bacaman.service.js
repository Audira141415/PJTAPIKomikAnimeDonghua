'use strict';

/**
 * Bacaman Scraper Service
 * Source: https://bacaman.id / https://bacaman.me / https://bacaman.net
 * Theme: Classic Indonesian Manga / WP-Manga hybrid
 *
 * Note: Sankavollerei API returned empty body for this source — domain may have moved.
 * Trying common alternate domains. Service implements standard selectors for both
 * Classic (.animepost) and Madara (.bsx) themes so it works regardless of which variant.
 *
 * Endpoints:
 *   home    GET /comic/bacaman/home
 *   latest  GET /comic/bacaman/latest/:page?
 *   popular GET /comic/bacaman/popular/:page?
 *   list    GET /comic/bacaman/list/:page?
 *   genres  GET /comic/bacaman/genres
 *   genre   GET /comic/bacaman/genre/:slug/:page?
 *   search  GET /comic/bacaman/search/:query/:page?
 *   detail  GET /comic/bacaman/detail/:slug
 *   chapter GET /comic/bacaman/chapter/:slug
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, resolveImage, slugFromUrl, clean } = require('../_base/parseHelpers');

const DOMAINS = [
  'https://bacaman.id',
  'https://bacaman.me',
  'https://bacaman.net',
  'https://www.bacaman.id',
];

const BASE_URL = DOMAINS[0];
const http = createHttpClient(BASE_URL, { Referer: `${BASE_URL}/` });

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

/* Supports both Classic (.animepost) and Madara (.bsx) cards */
const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('.entry-title, .tt, h2, h3').first().text()) ||
                clean($a.attr('title') || '');
  const $img  = $el.find('img').first();
  const cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || null;
  const chapter = clean($el.find('.epz a, .epxs, .adds .epxs').first().text());
  const type    = clean($el.find('.type, span[class^="type"]').first().text());
  return { title, slug, cover, chapter, type, link: href };
};

const home = async () => {
  const $ = await getPage('/');
  const popular = [];
  const latest  = [];

  $('[class*="populer"] .animepost, .bixbox .bsx, [class*="hot"] .bsx').each((i, el) => {
    if (i < 12) popular.push(parseCard($, el));
  });
  $('.listupd .animepost, .listupd .bsx, .bs').each((i, el) => {
    if (i < 20) latest.push(parseCard($, el));
  });

  return { popular, latestUpdates: latest };
};

const latest = async (page = 1) => {
  const $ = await getPage(`/page/${page}/`);
  const items = [];
  $('.animepost, .bsx, .bs').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const popular = async (page = 1) => {
  const $ = await getPage('/popular/', { page });
  const items = [];
  $('.animepost, .bsx, .bs, .film-info').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const list = async (page = 1) => {
  const $ = await getPage('/daftar-komik/', { page });
  const items = [];
  $('ul.clstyle li, .animepost, .bsx').each((_, el) => {
    const $el  = $(el);
    const $a   = $el.find('a').first();
    const href = $a.attr('href') || '';
    const slug = slugFromUrl(href);
    const title = clean($a.text()) || clean($el.find('.name').first().text());
    if (title && slug) items.push({ title, slug, link: href });
  });
  return { komikList: items, pagination: { currentPage: +page } };
};

const genres = async () => {
  const $ = await getPage('/genre/');
  const items = [];
  $('a[href*="/genre/"]').each((_, el) => {
    const href  = $(el).attr('href') || '';
    const title = clean($(el).text());
    const slug  = slugFromUrl(href);
    if (title && slug && !items.find(g => g.slug === slug))
      items.push({ title, slug });
  });
  return { genres: items };
};

const genre = async (slug, page = 1) => {
  const $ = await getPage(`/genre/${slug}/`, { page });
  const items = [];
  $('.animepost, .bsx, .bs').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, komikList: items, pagination: { currentPage: +page } };
};

const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('.animepost, .bsx, .bs, article').each((_, el) => items.push(parseCard($, el)));
  return { query, komikList: items, pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const $ = await getPage(`/komik/${slug}/`).catch(() => getPage(`/manga/${slug}/`));
  const title     = clean($('.entry-title, h1').first().text());
  const $img      = $('.thumb img, .summary_image img, .wp-post-image').first();
  const cover     = resolveImage($, $img, BASE_URL);
  const synopsis  = clean($('.entry-content p, .description-summary p').first().text());
  const rating    = clean($('.ratingmanga, .total_votes, #sidebar-rating').first().text());

  const info = {};
  $('.infox .spe span, .tsinfo .imptdt, .post-content_item').each((_, el) => {
    const text  = $(el).text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = clean(parts[0]).toLowerCase().replace(/\s+/g, '_');
      const val = clean(parts.slice(1).join(':'));
      if (key && val) info[key] = val;
    }
  });

  const genreList = [];
  $('a[href*="/genre/"], a[href*="/komik-genre/"]').each((_, el) => {
    genreList.push({ title: clean($(el).text()), slug: slugFromUrl($(el).attr('href') || '') });
  });

  const chapters = [];
  $('#chapterlist li a, .wp-manga-chapter a').each((_, el) => {
    const href   = $(el).attr('href') || '';
    const cSlug  = slugFromUrl(href);
    const $li    = $(el).closest('li');
    const cTitle = clean($(el).text()) || clean($li.find('.chapternum').first().text());
    const cDate  = clean($li.find('.chapterdate, .chapter-release-date').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate });
  });

  return { detail: { title, cover, synopsis, rating, info, genres: genreList, chapters } };
};

const chapter = async (slug) => {
  const $ = await getPage(`/${slug}/`);
  const title  = clean($('h1, .reading-title, title').first().text());
  const images = [];
  $('#readerarea img, .reading-content img, .img-loading').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder') && !src.includes('blank'))
      images.push(src.trim());
  });
  return { title, images };
};

module.exports = { home, latest, popular, list, genres, genre, search, detail, chapter };
