'use strict';

/**
 * Shinigami Scraper Service
 * Source: https://shinigami.id
 * Theme: Madara / MangaBooth Variant
 */

const { createHttpClient } = require('../_base/httpClient');
const { load, resolveImage, slugFromUrl, clean } = require('../_base/parseHelpers');

const BASE_URL = 'https://shinigami.id';
const http = createHttpClient(BASE_URL, { 
  Referer: 'https://shinigami.id/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

const getPage = async (path, params) => {
  try {
    const { data } = await http.get(path, { params });
    return load(data);
  } catch (err) {
    console.error(`Shinigami fetch error [${path}]:`, err.message);
    throw err;
  }
};

const parseCard = ($, el) => {
  const $el   = $(el);
  const $a    = $el.find('a').first();
  const href  = $a.attr('href') || '';
  const slug  = slugFromUrl(href);
  const title = clean($el.find('.post-title, h3, h2').first().text()) ||
                clean($a.attr('title') || '');
  const cover = $el.find('img').first().attr('src') || 
                $el.find('img').first().attr('data-src') || null;
  const chapter = clean($el.find('.chapter, .chapter-item').first().text());
  const type    = clean($el.find('.manga-type, .type').first().text());
  
  return { title, slug, cover: resolveImage($, cover, BASE_URL), chapter, type, link: href };
};

const latest = async (page = 1) => {
  // Shinigami latest usually on homepage or /manga/page/N/
  const path = page > 1 ? `/manga/page/${page}/` : '/';
  const $ = await getPage(path);
  const items = [];
  
  $('.manga-item, .page-item-detail, .manga-post').each((_, el) => {
    items.push(parseCard($, el));
  });

  return { komikList: items, pagination: { currentPage: +page } };
};

const list = async (page = 1) => {
  const $ = await getPage('/manga/', { page, m_orderby: 'latest' });
  const items = [];
  $('.manga-item, .page-item-detail').each((_, el) => items.push(parseCard($, el)));
  return { komikList: items, pagination: { currentPage: +page } };
};

const search = async (query, page = 1) => {
  const $ = await getPage('/', { s: query, post_type: 'wp-manga', page });
  const items = [];
  $('.manga-item, .c-tabs-item__content').each((_, el) => items.push(parseCard($, el)));
  return { query, komikList: items, pagination: { currentPage: +page } };
};

const detail = async (slug) => {
  const $ = await getPage(`/manga/${slug}/`);
  const title    = clean($('.post-title h1').text());
  const cover    = $('.summary_image img').attr('src') || null;
  const rating   = clean($('.post-total-rating .score').text());
  const synopsis = clean($('.description-summary').text());

  const info = {};
  $('.post-content_item').each((_, el) => {
    const key = clean($(el).find('.summary-heading').text()).toLowerCase().replace(/\s+/g, '_');
    const val = clean($(el).find('.summary-content').text());
    if (key && val) info[key] = val;
  });

  const chapters = [];
  $('.wp-manga-chapter').each((_, el) => {
    const $a = $(el).find('a').first();
    const href = $a.attr('href') || '';
    chapters.push({
      title: clean($a.text()),
      slug: slugFromUrl(href),
      date: clean($(el).find('.chapter-release-date').text())
    });
  });

  return { detail: { title, cover: resolveImage($, cover, BASE_URL), rating, synopsis, info, chapters } };
};

module.exports = { latest, list, search, detail };
