'use strict';

/**
 * Komikstation Scraper Service
 * Source: https://komikstation.co
 * Note: Site uses lazy-loaded images (data:svg placeholder).
 *       Actual images may be in data-src attributes.
 *
 * Endpoints:
 *   home            GET /comic/komikstation/home
 *   list            GET /comic/komikstation/list?type=&status=&order=&page=
 *   popular         GET /comic/komikstation/popular?page=
 *   recommendation  GET /comic/komikstation/recommendation
 *   top-weekly      GET /comic/komikstation/top-weekly
 *   ongoing         GET /comic/komikstation/ongoing?page=
 *   az-list         GET /comic/komikstation/az-list/:letter?page=
 *   genres          GET /comic/komikstation/genres
 *   genre           GET /comic/komikstation/genre/:slug/:page?
 *   search          GET /comic/komikstation/search/:query/:page?
 *   manga           GET /comic/komikstation/manga/:slug
 *   chapter         GET /comic/komikstation/chapter/:slug
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, resolveImage, slugFromUrl, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://komikstation.co';
const http = createHttpClient(BASE_URL, { Referer: 'https://komikstation.co/' });

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

// ── Parsers ───────────────────────────────────────────────────────────────────

const parseCard = ($, el) => {
  const $el  = $(el);
  const $a   = $el.find('a').first();
  const href = $a.attr('href') || '';
  const slug = slugFromUrl(href);
  const title = clean($el.find('.title, .komik-title, h3, h4, .tt').first().text()) ||
               clean($a.attr('title') || '');
  // Try src, then data-src for lazy-loaded images
  const $img = $el.find('img').first();
  const cover = $img.attr('src') ||
               $img.attr('data-src') ||
               $img.attr('data-lazy-src') || null;
  const chapter = clean($el.find('.komiklist-latest a, .chapter-latest, .latest-chapter').first().text());
  const rating  = clean($el.find('.rating, .score').first().text());
  const type    = clean($el.find('.type, .label-type').first().text());
  return { title, slug, cover, chapter, rating, type, sourceUrl: href };
};

// ── Service methods ────────────────────────────────────────────────────────────

const home = async () => {
  const $ = await getPage('/');
  const trending = [];
  const latest   = [];
  // Trending section
  $('[class*="trending"] .list-komik, [class*="popular"] .list-komik, .trending-komik .item').each((_, el) => trending.push(parseCard($, el)));
  // Latest section
  $('[class*="latest"] .list-komik, .chapter-list .item, .komik-item').each((_, el) => latest.push(parseCard($, el)));
  if (!trending.length && !latest.length) {
    // generic fallback
    $('.list-komik, .komik-list li, article').each((_, el) => latest.push(parseCard($, el)));
  }
  return { trending, latestUpdates: latest };
};

const list = async ({ type = '', status = '', order = 'popular', page = 1 } = {}) => {
  const params = {};
  if (type)   params.type   = type;
  if (status) params.status = status;
  if (order)  params.order  = order;
  if (page > 1) params.page = page;
  const $ = await getPage('/daftar-komik/', params);
  const items = [];
  $('.list-komik, .bsx, .animpost, article.item').each((_, el) => items.push(parseCard($, el)));
  const hasNext = !!$('a.next, a[rel="next"], .page-numbers .next').length;
  return {
    results: items,
    pagination: { currentPage: +page, hasNextPage: hasNext, nextPage: hasNext ? +page + 1 : null },
  };
};

const popular = async (page = 1) => {
  const $ = await getPage('/popular-komik/', { page });
  const items = [];
  $('.list-komik, .bsx, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { results: items, pagination: { currentPage: +page } };
};

const recommendation = async () => {
  const $ = await getPage('/');
  const items = [];
  $('[class*="recommendation"] .item, [class*="suggest"] .item').each((_, el) => items.push(parseCard($, el)));
  return { recommendations: items };
};

const topWeekly = async () => {
  const $ = await getPage('/');
  const items = [];
  $('[class*="top-weekly"] li, [class*="ranking"] li').each((_, el) => items.push(parseCard($, el)));
  return { topWeekly: items };
};

const ongoing = async (page = 1) => {
  const $ = await getPage('/daftar-komik/', { status: 'Ongoing', page });
  const items = [];
  $('.list-komik, .bsx, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { results: items, pagination: { currentPage: +page } };
};

const azList = async (letter = 'A', page = 1) => {
  const $ = await getPage('/az-list/', { letter, page });
  const items = [];
  $('.list-komik, a.item, li.item').each((_, el) => items.push(parseCard($, el)));
  return { letter, results: items, pagination: { currentPage: +page } };
};

const genres = async () => {
  const $ = await getPage('/');
  const list = [];
  $('a[href*="/genres/"], a[href*="/genre/"], .genre-list a, .taxlist a').each((_, el) => {
    const href  = $(el).attr('href') || '';
    const title = clean($(el).text());
    const slug  = slugFromUrl(href);
    if (slug && title) list.push({ title, slug });
  });
  return { genres: [...new Map(list.map(g => [g.slug, g])).values()] };
};

const byGenre = async (slug, page = 1) => {
  const $ = await getPage(`/genres/${slug}/`, { page });
  const items = [];
  $('.list-komik, .bsx, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, results: items, pagination: { currentPage: +page } };
};

const searchComics = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('.list-komik, .bsx, .animpost, article').each((_, el) => items.push(parseCard($, el)));
  return { query, results: items, pagination: { currentPage: +page } };
};

const mangaDetail = async (slug) => {
  const $ = await getPage(`/manga/${slug}/`);
  const title    = clean($('h1.entry-title, h1.series-title, h1').first().text());
  const $img     = $('.thumb img, .series-cover img, .info-cover img').first();
  const cover    = $img.attr('src') || $img.attr('data-src') || null;
  const rating   = clean($('.rating .score, .komik-score, .num').first().text());
  const synopsis = clean($('.entry-content p, .synopsis p, [itemprop="description"]').first().text());

  const info = {};
  $('.info-table tr, .series-info .info').each((_, el) => {
    const key = clean($(el).find('th, .info-label').first().text()).toLowerCase().replace(/\s+/g, '_');
    const val = clean($(el).find('td, .info-value').first().text());
    if (key && val) info[key] = val;
  });

  const genreList = [];
  $('a[href*="/genres/"], .genre-list a, .genres a').each((_, el) => {
    const href  = $(el).attr('href') || '';
    genreList.push({ title: clean($(el).text()), slug: slugFromUrl(href) });
  });

  const chapters = [];
  $('#chapter-list li, .chapter-list li, .list-chapter li').each((_, el) => {
    const $a    = $(el).find('a').first();
    const href  = $a.attr('href') || '';
    const cSlug = slugFromUrl(href);
    const cTitle = clean($a.text());
    const cDate  = clean($(el).find('.chapter-date, .date').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate, url: href });
  });

  return { details: { title, cover, rating, synopsis, info, genres: genreList, chapters } };
};

const chapterRead = async (slug) => {
  const $ = await getPage(`/chapter/${slug}/`);
  const title  = clean($('h1.entry-title, h1, title').first().text());
  const images = [];
  $('#readerarea img, .chapter-viewer img, .chapter-content img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder')) images.push(src);
  });
  const prev = $('a.prev_page, a[rel="prev"]').attr('href') || null;
  const next = $('a.next_page, a[rel="next"]').attr('href') || null;
  return { title, images, navigation: { prev, next } };
};

module.exports = {
  home, list, popular, recommendation, topWeekly, ongoing,
  azList, genres, byGenre, searchComics, mangaDetail, chapterRead,
};
