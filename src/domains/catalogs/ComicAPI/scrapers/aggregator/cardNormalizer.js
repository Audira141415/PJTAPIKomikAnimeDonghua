'use strict';

const VALID_TYPES = new Set(['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona']);

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.replace(/\s+/g, ' ').trim();
  return text || null;
};

const normalizeSlug = (value) => {
  if (typeof value === 'string') {
    return normalizeText(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
};

const normalizeRating = (value) => {
  const text = normalizeText(typeof value === 'number' ? String(value) : value);
  if (!text) {
    return null;
  }

  const cleaned = text
    .replace(/[,，]/g, '.')
    .replace(/\.{2,}/g, '.');

  const match = cleaned.match(/\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const rating = Number.parseFloat(match[0]);
  return Number.isNaN(rating) ? null : rating;
};

const normalizeType = (value) => {
  const text = normalizeText(value)?.toLowerCase();
  if (!text) {
    return null;
  }

  for (const type of VALID_TYPES) {
    if (text === type || text.includes(type)) {
      return type;
    }
  }

  return null;
};

const pickTitle = (card) =>
  normalizeText(card.title) ||
  normalizeText(card.name) ||
  normalizeText(card.post_title) ||
  null;

const normalizeCard = (card, source) => {
  if (!card || typeof card !== 'object') {
    return null;
  }

  const title = pickTitle(card);
  const slug = normalizeSlug(card.slug || card.post_name || card.id);
  if (!title) {
    return null;
  }

  const cover =
    normalizeText(card.cover) ||
    normalizeText(card.coverImage) ||
    normalizeText(card.image) ||
    normalizeText(card.thumbnail) ||
    normalizeText(card.thumbnail_url) ||
    normalizeText(card.imageSrc) ||
    null;

  const chapter =
    normalizeText(card.chapter) ||
    normalizeText(card.latestChapter) ||
    normalizeText(card.last_chapter) ||
    normalizeText(card.firstChapter?.title) ||
    null;

  const type = normalizeType(card.type || card.post_type);
  const rating = normalizeRating(card.rating ?? card.score);
  const link =
    normalizeText(card.link) ||
    normalizeText(card.url) ||
    normalizeText(card.href) ||
    null;

  return { source, title, slug, cover, chapter, type, rating, link };
};

module.exports = {
  normalizeCard,
  normalizeRating,
  normalizeText,
  normalizeType,
};