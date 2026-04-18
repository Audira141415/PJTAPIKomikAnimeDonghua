'use strict';

/**
 * Maid Comic Scraper Service
 * Source: https://maidcomic.id  (also tried maidcomic.net — NXDOMAIN)
 * Theme: Madara / WP-Manga theme
 *
 * Endpoints:
 *   list      GET /comic/maid/list
 *   api       GET /comic/maid/api
 *   latest    GET /comic/maid/latest?page=
 *   manga     GET /comic/maid/manga/:slug
 *   chapter   GET /comic/maid/chapter/:slug
 *   genres    GET /comic/maid/genres
 *   byGenre   GET /comic/maid/genres/:slug?page=
 *   search    GET /comic/maid/search?title=&page=
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, slugFromUrl, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://maidcomic.id';
const http = createHttpClient(BASE_URL, { Referer: 'https://maidcomic.id/' });

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('.tt, h3, h4, .entry-title').first().text()) ||
                clean($a.attr('title') || '');
  const $img  = $el.find('img').first();
  const cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || null;
  const chapter = clean($el.find('.epxs, .adds .epxs, .epz a').first().text());
  const type    = clean($el.find('.type, span[class^="type"]').first().text());
  return { title, slug, cover, chapter, type, link: href };
};

const list = async () => {
  const $ = await getPage('/manga/', { order: 'alphabet' });
  const items = [];
  $('.bsx, .animpost, article').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items };
};

const api = async () => {
  const $ = await getPage('/');
  const items = [];
  $('[class*="hot"] .bsx, .popular .bsx, .trending .bsx, .bsx').each((i, el) => {
    if (i < 20) items.push(parseCard($, el));
  });
  return { hotProjects: items };
};

const latest = async (page = 1) => {
  const $ = await getPage('/', { page });
  const items = [];
  $('.bsx, .listupd .bs, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const manga = async (slug) => {
  const $ = await getPage(`/manga/${slug}/`);
  const title    = clean($('.entry-title, .post-title, h1').first().text());
  const $img     = $('.summary_image img, .tab-summary img').first();
  const cover    = $img.attr('src') || $img.attr('data-src') || null;
  const rating   = clean($('.total_votes, .score').first().text());
  const synopsis = clean($('.description-summary p, .entry-content p').first().text());

  const info = {};
  $('.post-status .post-content_item').each((_, el) => {
    const key = clean($(el).find('.summary-heading').first().text()).toLowerCase().replace(/\s+/g, '_');
    const val = clean($(el).find('.summary-content').first().text());
    if (key && val) info[key] = val;
  });

  const genreList = [];
  $('.genres-content a').each((_, el) => {
    genreList.push({ title: clean($(el).text()), slug: slugFromUrl($(el).attr('href') || '') });
  });

  const chapters = [];
  $('.wp-manga-chapter a, #chapterlist li a').each((_, el) => {
    const href   = $(el).attr('href') || '';
    const cSlug  = slugFromUrl(href);
    const $li    = $(el).closest('li');
    const cTitle = clean($(el).text());
    const cDate  = clean($li.find('.chapter-release-date').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate, url: href });
  });

  return { detail: { title, cover, rating, synopsis, info, genres: genreList, chapters } };
};

const chapter = async (slug) => {
  const $ = await getPage(`/${slug}/`);
  const title  = clean($('h1, .reading-title, title').first().text());
  const images = [];
  $('#readerarea img, .reading-content img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder')) images.push(src.trim());
  });
  return { title, images };
};

const genres = async () => {
  const $ = await getPage('/');
  const list = [];
  $('a[href*="/genre/"], .genre-list a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const title = clean($(el).text());
    const slug  = slugFromUrl(href);
    if (title && slug) list.push({ title, slug });
  });
  return { genres: [...new Map(list.map(g => [g.slug, g])).values()] };
};

const byGenre = async (slug, page = 1) => {
  const $ = await getPage(`/genre/${slug}/`, { page });
  const items = [];
  $('.bsx, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, komikList: items, pagination: { currentPage: +page } };
};

const search = async (title, page = 1) => {
  const $ = await getPage('/', { s: title, page });
  const items = [];
  $('.bsx, .animpost, article').each((_, el) => items.push(parseCard($, el)));
  return { query: title, komikList: items, pagination: { currentPage: +page } };
};

module.exports = { list, api, latest, manga, chapter, genres, byGenre, search };
