'use strict';

const cheerio = require('cheerio');

/** Load HTML string into cheerio */
const load = (html) => cheerio.load(html);

/**
 * Normalise an image URL:
 *  - prefer src, fallback to data-src / data-lazy / srcset first entry
 *  - prepend baseUrl if the path is relative
 */
const resolveImage = ($el, baseUrl = '') => {
  const img = $el.find('img').first();
  const src =
    img.attr('src') ||
    img.attr('data-src') ||
    img.attr('data-lazy') ||
    img.attr('data-original') ||
    '';

  // If src looks like a placeholder / blank, try srcset
  const useSrc = src && !src.includes('placeholder') && !src.includes('data:');
  if (useSrc) return src.startsWith('http') ? src : `${baseUrl}${src}`;

  const srcset = img.attr('srcset') || img.attr('data-srcset') || '';
  const first = srcset.split(',')[0]?.trim().split(' ')[0] || '';
  if (first) return first.startsWith('http') ? first : `${baseUrl}${first}`;

  return null;
};

/**
 * Extract slug from url: "/manga/some-title-here/" → "some-title-here"
 */
const slugFromUrl = (url = '') =>
  url.replace(/\/$/, '').split('/').filter(Boolean).pop() || url;

/** Safely parse integers from text like "Ep 12" or "1,234" */
const parseIntText = (text = '') =>
  parseInt(text.replace(/[^\d]/g, ''), 10) || 0;

/** Trim + collapse whitespace */
const clean = (text = '') => text.replace(/\s+/g, ' ').trim();

module.exports = { load, resolveImage, slugFromUrl, parseIntText, clean };
