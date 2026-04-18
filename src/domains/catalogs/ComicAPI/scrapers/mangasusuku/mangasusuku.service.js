'use strict';

/**
 * Mangasusuku Scraper Service
 * Source: https://mangasusuku.com
 * Theme: Madara-variant (.bsx, .listupd) — nearly identical to Mangakita
 * Difference: URL prefix /komik/ instead of /manga/
 *
 * Endpoints:
 *   home       GET /comic/mangasusuku/home/:page?
 *   latest     GET /comic/mangasusuku/latest/:page?
 *   popular    GET /comic/mangasusuku/popular/:page?
 *   list       GET /comic/mangasusuku/list/:page?
 *   byChar     GET /comic/mangasusuku/list-by-char/:char/:page?
 *   search     GET /comic/mangasusuku/search/:query/:page?
 *   genres     GET /comic/mangasusuku/genres
 *   genre      GET /comic/mangasusuku/genre/:slug/:page?
 *   detail     GET /comic/mangasusuku/detail/:slug
 *   chapter    GET /comic/mangasusuku/chapter/:slug
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, slugFromUrl, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://mangasusuku.com';
const http = createHttpClient(BASE_URL, { Referer: 'https://mangasusuku.com/' });

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('.tt, h3, h4').first().text()) || clean($a.attr('title') || '');
  const $img  = $el.find('img').first();
  const cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || null;
  const chapter = clean($el.find('.epxs, .adds .epxs, .svenchapters .eph-num a').first().text());
  const type    = clean($el.find('.type, span[class^="type"]').first().text());
  const score   = clean($el.find('i.fas, .numscore').first().text());
  return { title, slug, cover, chapter, type, score, link: href };
};

const home = async (page = 1) => {
  const $ = await getPage(`/page/${page}/`);
  const popular = [];
  const latest  = [];
  $('[class*="hot"] .bsx, .bixbox .bsx').each((i, el) => {
    if (i < 12) popular.push(parseCard($, el));
  });
  $('.listupd .bsx').each((i, el) => {
    if (i < 20) latest.push(parseCard($, el));
  });
  return { popular, latestUpdates: latest, pagination: { currentPage: +page } };
};

const latest = async (page = 1) => {
  const $ = await getPage(`/page/${page}/`);
  const items = [];
  $('.bsx, .listupd .bs').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const popular = async (page = 1) => {
  const $ = await getPage('/popular/', { page });
  const items = [];
  $('.bsx, .bs').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const list = async (page = 1) => {
  const $ = await getPage('/komik/', { page, order: 'alphabet' });
  const items = [];
  $('.bsx, .bs').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const byChar = async (char, page = 1) => {
  const $ = await getPage(`/komik/${char}/`, { page });
  const items = [];
  $('.bsx, .bs').each((_, el) => items.push(parseCard($, el)));
  return { char, komikList: items, pagination: { currentPage: +page } };
};

const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('.bsx, .bs, article').each((_, el) => items.push(parseCard($, el)));
  return { query, komikList: items, pagination: { currentPage: +page } };
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
  $('.bsx, .bs').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, komikList: items, pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const $ = await getPage(`/komik/${slug}/`);
  const title    = clean($('.entry-title, .ts-breadcrumb li').last().text());
  const $img     = $('.sventhumb img, .thumb img, .summary_image img').first();
  const cover    = $img.attr('src') || $img.attr('data-src') || null;
  const synopsis = clean($('.entry-content p, .description-summary p, .wd-full p').first().text());
  const rating   = clean($('.total_votes, .num_votes, .score').first().text());

  const info = {};
  $('.tsinfo .imptdt, .infotable tr').each((_, el) => {
    let key, val;
    const $el = $(el);
    const $h  = $el.find('td, b, span').first();
    const text = $el.text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      key = clean(parts[0]).toLowerCase().replace(/\s+/g, '_');
      val = clean(parts.slice(1).join(':'));
    }
    if (key && val) info[key] = val;
  });

  const genreList = [];
  $('a[href*="/genre/"]').each((_, el) => {
    genreList.push({ title: clean($(el).text()), slug: slugFromUrl($(el).attr('href') || '') });
  });

  const chapters = [];
  $('.wp-manga-chapter a, #chapterlist li a, .svenchapters .eph-num a').each((_, el) => {
    const href   = $(el).attr('href') || '';
    const cSlug  = slugFromUrl(href);
    const $li    = $(el).closest('li');
    const cTitle = clean($(el).text());
    const cDate  = clean($li.find('.chapter-release-date, .chapterdate').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate });
  });

  return { detail: { title, cover, synopsis, rating, info, genres: genreList, chapters } };
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

module.exports = { home, latest, popular, list, byChar, search, genres, genre, detail, chapter };
