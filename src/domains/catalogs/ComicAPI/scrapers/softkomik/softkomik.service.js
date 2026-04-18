'use strict';

/**
 * Softkomik Scraper Service
 * Source: https://softkomik.com
 * Note: Next.js SPA — sankavollerei returned empty HTML response.
 * Tries Next.js API routes (_next/data / __NEXT_DATA__) for SSR JSON.
 *
 * Endpoints:
 *   home     GET /comic/softkomik/home
 *   latest   GET /comic/softkomik/latest?page=
 *   popular  GET /comic/softkomik/popular?page=
 *   list     GET /comic/softkomik/list?page=
 *   genres   GET /comic/softkomik/genres
 *   genre    GET /comic/softkomik/genre/:slug?page=
 *   search   GET /comic/softkomik/search?q=&page=
 *   detail   GET /comic/softkomik/detail/:slug
 *   chapter  GET /comic/softkomik/chapter/:slug
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, slugFromUrl, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://softkomik.com';
const http = createHttpClient(BASE_URL, { Referer: 'https://softkomik.com/' });

/* Try Next.js SSR JSON first, fall back to HTML parsing */
const getNextData = async (path) => {
  try {
    const { data: html } = await http.get(path);
    const $ = load(html);
    const raw = $('#__NEXT_DATA__').html();
    if (raw) {
      const json = JSON.parse(raw);
      return json.props?.pageProps || null;
    }
  } catch {
    return null;
  }
  return null;
};

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('h3, h4, .title, [class*="title"]').first().text()) ||
                clean($a.attr('title') || '');
  const $img  = $el.find('img').first();
  const cover = $img.attr('src') || $img.attr('data-src') || null;
  const chapter = clean($el.find('[class*="chapter"], [class*="latest"]').first().text());
  return { title, slug, cover, chapter, link: href };
};

const home = async () => {
  const props = await getNextData('/');
  if (props) return { home: props };
  const $ = await getPage('/');
  const items = [];
  $('article, .card, [class*="manga"]').each((i, el) => {
    if (i < 20) items.push(parseCard($, el));
  });
  return { home: items };
};

const latest = async (page = 1) => {
  const props = await getNextData(`/?page=${page}`);
  if (props) return { ...props, pagination: { currentPage: +page } };
  const $ = await getPage('/', { page });
  const items = [];
  $('article, .card, [class*="manga"]').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const popular = async (page = 1) => {
  const props = await getNextData(`/popular?page=${page}`);
  if (props) return { ...props, pagination: { currentPage: +page } };
  const $ = await getPage('/popular', { page });
  const items = [];
  $('article, .card, [class*="manga"]').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const list = async (page = 1) => {
  const props = await getNextData(`/manga?page=${page}`);
  if (props) return { ...props, pagination: { currentPage: +page } };
  const $ = await getPage('/manga', { page });
  const items = [];
  $('article, .card, [class*="manga"]').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const genres = async () => {
  const $ = await getPage('/genre');
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
  const $ = await getPage(`/genre/${slug}`, { page });
  const items = [];
  $('article, .card, [class*="manga"]').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, komikList: items, pagination: { currentPage: +page } };
};

const search = async (q, page = 1) => {
  const $ = await getPage('/', { s: q, page });
  const items = [];
  $('article, .card, [class*="manga"], [class*="result"]').each((_, el) =>
    items.push(parseCard($, el)));
  return { query: q, komikList: items, pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const props = await getNextData(`/manga/${slug}`);
  if (props) return { detail: props };
  const $ = await getPage(`/manga/${slug}`);
  const title   = clean($('h1, [class*="title"]').first().text());
  const $img    = $('img[class*="cover"], img[alt]').first();
  const cover   = $img.attr('src') || $img.attr('data-src') || null;
  const synopsis = clean($('[class*="synopsis"], [class*="description"]').first().text());

  const chapters = [];
  $('[class*="chapter"] a').each((_, el) => {
    const href   = $(el).attr('href') || '';
    const cSlug  = slugFromUrl(href);
    const cTitle = clean($(el).text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug });
  });
  return { detail: { title, cover, synopsis, chapters } };
};

const chapter = async (slug) => {
  const $ = await getPage(`/${slug}`);
  const title  = clean($('h1, [class*="title"]').first().text());
  const images = [];
  $('[class*="reader"] img, [class*="page"] img, [class*="chapter"] img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src && src.startsWith('http') && !src.includes('logo')) images.push(src.trim());
  });
  return { title, images };
};

module.exports = { home, latest, popular, list, genres, genre, search, detail, chapter };
