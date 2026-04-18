'use strict';

/**
 * Mangakita Scraper Service
 * Source: https://mangakita.me
 * Theme: Madara / WP-Manga theme
 *
 * Endpoints:
 *   home         GET /comic/mangakita/home
 *   list         GET /comic/mangakita/list?order=&status=&type=&page=
 *   projects     GET /comic/mangakita/projects/:page?
 *   daftar-manga GET /comic/mangakita/daftar-manga/:page?
 *   genres       GET /comic/mangakita/genres
 *   genre        GET /comic/mangakita/genres/:slug/:page?
 *   rekomendasi  GET /comic/mangakita/rekomendasi
 *   search       GET /comic/mangakita/search/:query/:page?
 *   detail       GET /comic/mangakita/detail/:slug
 *   chapter      GET /comic/mangakita/chapter/:slug
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, slugFromUrl, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://mangakita.me';
const http = createHttpClient(BASE_URL, { Referer: 'https://mangakita.me/' });

const getPage = async (path, params) => {
  const { data } = await http.get(path, { params });
  return load(data);
};

// ── Parsers ───────────────────────────────────────────────────────────────────

/** Madara theme card (.bsx) → object */
const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('.tt, h3, h4').first().text()) ||
                clean($a.attr('title') || '');
  const $img  = $el.find('.limit img, img').first();
  const cover = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || null;
  const chapter = clean($el.find('.epxs, .adds .epxs').first().text());
  const rating  = clean($el.find('.numscore, .score, .rating').first().text());
  const type    = clean($el.find('.type, span[class^="type"]').first().text());
  return { title, slug, image: cover, latestChapter: chapter, rating, type, link: href };
};

/** Madara detail page — info table */
const parseDetail = ($) => {
  const title     = clean($('.entry-title, .post-title, h1').first().text());
  const $img      = $('.summary_image img, .tab-summary img, img.img-responsive').first();
  const image     = $img.attr('src') || $img.attr('data-src') || null;
  const rating    = clean($('.total_votes, .score, .post-rating').first().text());
  const synopsis  = clean($('.description-summary p, .entry-content p, .summary__content p').first().text());
  const alt       = clean($('.manga-title-badges, .post-status:contains("Alt") .summary-content, .alternative').first().text());

  const info = {};
  $('.post-status .post-content_item, .manga-info-list li').each((_, el) => {
    const key = clean($(el).find('.summary-heading, .type').first().text()).toLowerCase().replace(/\s+/g, '_');
    const val = clean($(el).find('.summary-content, .value').first().text());
    if (key && val) info[key] = val;
  });

  const genres = [];
  $('.genres-content a, .genres a, .post-content_item:contains("Genre") a').each((_, el) => {
    genres.push({ title: clean($(el).text()), slug: slugFromUrl($(el).attr('href') || '') });
  });

  const chapters = [];
  $('.wp-manga-chapter a, #chapterlist li a, .chapter-list a').each((_, el) => {
    const href  = $(el).attr('href') || '';
    const cSlug = slugFromUrl(href);
    const $li   = $(el).closest('li');
    const cTitle = clean($(el).text());
    const cDate  = clean($li.find('.chapter-release-date, .chapter-date').first().text());
    if (cSlug) chapters.push({ title: cTitle, slug: cSlug, date: cDate, url: href });
  });

  return { title, alternative: alt, image, rating, synopsis, info, genres, chapters };
};

// ── Service Methods ────────────────────────────────────────────────────────────

const home = async () => {
  const $ = await getPage('/');
  const popularToday = [];
  const latestUpdates = [];

  // Popular today (usually a list/grid section)
  $('.bix-box-row .bsx, .popular .bsx, [class*="popular"] .bsx, .utao .uta').each((_, el) => popularToday.push(parseCard($, el)));
  // Latest updates
  $('[class*="latest"] .bs, .listupd .bs, .uta').each((_, el) => latestUpdates.push(parseCard($, el)));
  // Fallback
  if (!popularToday.length) $('.bsx').each((_, el) => popularToday.push(parseCard($, el)));

  return { popularToday: popularToday.slice(0, 20), latestUpdates: latestUpdates.slice(0, 20) };
};

const list = async ({ order = 'update', status = '', type = '', page = 1 } = {}) => {
  const $ = await getPage('/manga/', { order, status, type, page });
  const items = [];
  $('.bsx, .animpost').each((_, el) => items.push(parseCard($, el)));
  const hasNext = !!$('.nextpostslink, a.next, a[rel="next"]').length;
  return {
    items,
    pagination: {
      currentPage: +page,
      hasNextPage: hasNext,
      nextPage: hasNext ? +page + 1 : null,
    },
  };
};

const projects = async (page = 1) => {
  const $ = await getPage('/manga/', { page, project: 'true' });
  const items = [];
  $('.bsx').each((_, el) => items.push(parseCard($, el)));
  return { items, pagination: { currentPage: +page } };
};

const daftarManga = async (page = 1) => {
  const $ = await getPage('/manga/', { page, order: 'alphabet' });
  const items = [];
  $('.bsx').each((_, el) => items.push(parseCard($, el)));
  return { items, pagination: { currentPage: +page } };
};

const genres = async () => {
  const $ = await getPage('/');
  const list = [];
  $('a[href*="/genre/"], a[href*="/genres/"], .genre-list a, .taxlist a').each((_, el) => {
    const href = $(el).attr('href') || '';
    list.push({ title: clean($(el).text()), slug: slugFromUrl(href) });
  });
  return { genres: [...new Map(list.map(g => [g.slug, g])).values()].filter(g => g.slug) };
};

const byGenre = async (slug, page = 1) => {
  const $ = await getPage(`/genre/${slug}/`, { page });
  const items = [];
  $('.bsx, .animpost').each((_, el) => items.push(parseCard($, el)));
  return { genre: slug, items, pagination: { currentPage: +page } };
};

const rekomendasi = async () => {
  const $ = await getPage('/');
  const items = [];
  $('[class*="recommend"] .bsx, [class*="suggest"] .bsx').each((_, el) => items.push(parseCard($, el)));
  if (!items.length) $('.bsx').each((i, el) => { if (i < 12) items.push(parseCard($, el)); });
  return { recommendations: items };
};

const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, page });
  const items = [];
  $('.bsx, .animpost, article.post').each((_, el) => items.push(parseCard($, el)));
  return { query, items, pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const $ = await getPage(`/manga/${slug}/`);
  return { details: parseDetail($) };
};

const chapter = async (slug) => {
  const $ = await getPage(`/${slug}/`);
  const title = clean($('.chapter-title, h1, title').first().text());
  const $comic = $('[class*="comic-slug"], .reading-content').first();
  const comicSlug = slugFromUrl($('meta[property="og:url"]').attr('content') || '');
  const images = [];
  $('#readerarea img, .reading-content img, .reader-area img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy') || '';
    if (src && src.startsWith('http') && !src.includes('placeholder')) images.push(src.trim());
  });
  const prev = $('a.prev_page, .nav-links .prev, a[rel="prev"]').attr('href') || '#prev';
  const next = $('a.next_page, .nav-links .next, a[rel="next"]').attr('href') || '#next';
  const related = [];
  $('[class*="related"] .bsx').each((_, el) => related.push(parseCard($, el)));
  return { title, comicSlug, images, navigation: { prev, next }, relatedSeries: related };
};

module.exports = { home, list, projects, daftarManga, genres, byGenre, rekomendasi, search, detail, chapter };
