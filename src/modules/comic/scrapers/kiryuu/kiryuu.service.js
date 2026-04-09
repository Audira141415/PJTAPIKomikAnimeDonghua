'use strict';

/**
 * Kiryuu Scraper Service
 * Source: https://v2.kiryuu.to
 * Theme: Custom Tailwind CSS — not Classic/Madara. Uses generic selectors.
 *
 * Endpoints:
 *   home     GET /comic/kiryuu/home
 *   latest   GET /comic/kiryuu/latest/:page?
 *   popular  GET /comic/kiryuu/popular/:page?
 *   trending GET /comic/kiryuu/trending
 *   list     GET /comic/kiryuu/list/:page?
 *   genres   GET /comic/kiryuu/genres
 *   genre    GET /comic/kiryuu/genre/:slug/:page?
 *   search   GET /comic/kiryuu/search/:query/:page?
 *   detail   GET /comic/kiryuu/detail/:slug
 *   chapter  GET /comic/kiryuu/chapter/:slug
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, slugFromUrl, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://v2.kiryuu.to';
const http = createHttpClient(BASE_URL, { Referer: 'https://v2.kiryuu.to/' });

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

/* Kiryuu uses Tailwind custom layout — try multiple selector patterns */
const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);

  /* Title: try multiple selectors in priority order */
  const title = clean(
    $el.find('h3, h4, .title, [class*="title"]').first().text() ||
    $a.attr('title') || ''
  );

  /* Cover image */
  const $img  = $el.find('img').first();
  const cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || null;

  /* Latest chapter */
  const chapter = clean(
    $el.find('[class*="chapter"], [class*="latest"], .epxs').first().text()
  );

  /* Score / rating */
  const score = clean(
    $el.find('[class*="rating"], [class*="score"], [class*="star"]').first().text()
  );

  const type = clean($el.find('[class*="type"], [class*="badge"]').first().text());

  return { title, slug, cover, chapter, type, score, link: href };
};

const home = async () => {
  const $ = await getPage('/');
  const popular = [];
  const latest  = [];

  /* Trending/popular section */
  $('[class*="popular"] [class*="item"], [class*="trending"] [class*="item"]').each((i, el) => {
    if (i < 12) popular.push(parseCard($, el));
  });

  /* Latest updates */
  $('[class*="latest"] [class*="item"], [class*="update"] [class*="item"]').each((i, el) => {
    if (i < 20) latest.push(parseCard($, el));
  });

  /* Fallback: grab any card-like elements */
  if (!popular.length && !latest.length) {
    $('article, .card, [class*="manga"], [class*="comic"]').each((i, el) => {
      if (i < 20) latest.push(parseCard($, el));
    });
  }

  return { popular, latestUpdates: latest };
};

const trending = async () => {
  const $ = await getPage('/');
  const items = [];
  $('[class*="trending"] [class*="item"], [class*="hot"] [class*="item"]').each((_, el) =>
    items.push(parseCard($, el)));
  return { trending: items };
};

const latest = async (page = 1) => {
  const $ = await getPage(`/page/${page}/`);
  const items = [];
  $('[class*="item"], article, .card').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items.filter(i => i.slug), pagination: { currentPage: +page } };
};

const popular = async (page = 1) => {
  const $ = await getPage('/popular/', { page });
  const items = [];
  $('[class*="item"], article, .card').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items.filter(i => i.slug), pagination: { currentPage: +page } };
};

const list = async (page = 1) => {
  const $ = await getPage('/manga/', { page });
  const items = [];
  $('[class*="item"], article, .card').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items.filter(i => i.slug), pagination: { currentPage: +page } };
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
  $('[class*="item"], article, .card').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, komikList: items.filter(i => i.slug), pagination: { currentPage: +page } };
};

const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('[class*="item"], article, .card, .bsx').each((_, el) => items.push(parseCard($, el)));
  return { query, komikList: items.filter(i => i.slug), pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const $ = await getPage(`/manga/${slug}/`);
  const title    = clean($('h1, [class*="title"]').first().text());
  const $img     = $('img[class*="cover"], img[class*="thumb"], img[alt]').first();
  const cover    = $img.attr('src') || $img.attr('data-src') || null;
  const synopsis = clean($('[class*="synopsis"] p, [class*="description"] p').first().text()) ||
                   clean($('p').first().text());
  const rating   = clean($('[class*="rating"], [class*="score"]').first().text());

  const info = {};
  $('[class*="info"] li, [class*="meta"] li, table tr').each((_, el) => {
    const text  = $(el).text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = clean(parts[0]).toLowerCase().replace(/\s+/g, '_');
      const val = clean(parts.slice(1).join(':'));
      if (key && val && key.length < 30) info[key] = val;
    }
  });

  const genreList = [];
  $('a[href*="/genre/"]').each((_, el) => {
    genreList.push({ title: clean($(el).text()), slug: slugFromUrl($(el).attr('href') || '') });
  });

  const chapters = [];
  $('[class*="chapter"] a, [class*="episode"] a').each((_, el) => {
    const href   = $(el).attr('href') || '';
    const cSlug  = slugFromUrl(href);
    const cTitle = clean($(el).text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, url: href });
  });

  return { detail: { title, cover, synopsis, rating, info, genres: genreList, chapters } };
};

const chapter = async (slug) => {
  const $ = await getPage(`/${slug}/`);
  const title  = clean($('h1, [class*="title"]').first().text());
  const images = [];
  $('[class*="reader"] img, [class*="chapter"] img, [class*="page"] img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder')) images.push(src.trim());
  });
  /* Fallback to all images if none found */
  if (!images.length) {
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || '';
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon'))
        images.push(src.trim());
    });
  }
  return { title, images };
};

module.exports = { home, latest, popular, trending, list, genres, genre, search, detail, chapter };
