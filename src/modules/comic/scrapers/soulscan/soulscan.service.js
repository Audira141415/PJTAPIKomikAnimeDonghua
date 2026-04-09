'use strict';

/**
 * SoulScans Scraper Service
 * Source: https://soulscan.net (primary) / https://soulscanid.net / https://soulscanapp.net
 * Theme: Madara / WP-Manga — standard .bsx/.listupd selectors
 *
 * Endpoints:
 *   home    GET /comic/soulscan/home
 *   latest  GET /comic/soulscan/latest/:page?
 *   popular GET /comic/soulscan/popular/:page?
 *   list    GET /comic/soulscan/list/:page?
 *   genres  GET /comic/soulscan/genres
 *   genre   GET /comic/soulscan/genre/:slug/:page?
 *   search  GET /comic/soulscan/search/:query/:page?
 *   detail  GET /comic/soulscan/detail/:slug
 *   chapter GET /comic/soulscan/chapter/:slug
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, slugFromUrl, clean } = require('../_base/parseHelpers');

/* Try primary domain — fallback list in order if it times out */
const DOMAINS = [
  'https://soulscan.net',
  'https://soulscanid.net',
  'https://soulscanapp.net',
  'https://soulscan.cloud',
];

let http = createHttpClient(DOMAINS[0], { Referer: `${DOMAINS[0]}/` });

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
  const chapter = clean($el.find('.epxs, .adds .epxs, .clast').first().text());
  const type    = clean($el.find('.type, span[class^="type"]').first().text());
  const score   = clean($el.find('i, .numscore').first().text());
  return { title, slug, cover, chapter, type, score, link: href };
};

const home = async () => {
  const $ = await getPage('/');
  const sections = {};

  /* Hot / Featured */
  const hot = [];
  $('[class*="hot"] .bsx, .bixbox .bsx').each((i, el) => {
    if (i < 12) hot.push(parseCard($, el));
  });
  sections.hot = hot;

  /* Latest */
  const latest = [];
  $('.listupd .bsx, .latest .bsx').each((i, el) => {
    if (i < 20) latest.push(parseCard($, el));
  });
  sections.latestUpdates = latest;

  return sections;
};

const latest = async (page = 1) => {
  const $ = await getPage(`/page/${page}/`);
  const items = [];
  $('.bsx, .listupd .bs, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const popular = async (page = 1) => {
  const $ = await getPage('/popular/', { page });
  const items = [];
  $('.bsx, .bs, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const list = async (page = 1) => {
  const $ = await getPage('/manga/', { page, order: 'alphabet' });
  const items = [];
  $('.bsx, .bs, .animpost').each((_, el) => items.push(parseCard($, el)));
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
  $('.bsx, .bs, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, komikList: items, pagination: { currentPage: +page } };
};

const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('.bsx, .bs, .animpost, article').each((_, el) => items.push(parseCard($, el)));
  return { query, komikList: items, pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const $ = await getPage(`/manga/${slug}/`);
  const title    = clean($('.entry-title, .ts-breadcrumb li').last().text());
  const $img     = $('.thumb img, .summary_image img, .wp-post-image').first();
  const cover    = $img.attr('src') || $img.attr('data-src') || null;
  const synopsis = clean($('.entry-content p, .description-summary p').first().text());
  const rating   = clean($('.total_votes, .num_votes, .score, #sidebar-rating').first().text());

  const info = {};
  $('.tsinfo .imptdt, .post-status .post-content_item').each((_, el) => {
    const text  = $(el).text();
    const parts = text.split(':');
    if (parts.length >= 2) {
      const key = clean(parts[0]).toLowerCase().replace(/\s+/g, '_');
      const val = clean(parts.slice(1).join(':'));
      if (key && val) info[key] = val;
    }
  });

  const genreList = [];
  $('a[href*="/genre/"]').each((_, el) => {
    genreList.push({ title: clean($(el).text()), slug: slugFromUrl($(el).attr('href') || '') });
  });

  const chapters = [];
  $('.wp-manga-chapter a, #chapterlist li a').each((_, el) => {
    const href   = $(el).attr('href') || '';
    const cSlug  = slugFromUrl(href);
    const $li    = $(el).closest('li');
    const cTitle = clean($(el).text());
    const cDate  = clean($li.find('.chapter-release-date').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate });
  });

  return { detail: { title, cover, synopsis, rating, info, genres: genreList, chapters } };
};

const chapter = async (slug) => {
  const $ = await getPage(`/${slug}/`);
  const title  = clean($('h1, title').first().text());
  const images = [];
  $('#readerarea img, .reading-content img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder')) images.push(src.trim());
  });
  return { title, images };
};

module.exports = { home, latest, popular, list, genres, genre, search, detail, chapter };
