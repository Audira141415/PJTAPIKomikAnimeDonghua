/**
 * Domain-level enum constants.
 * Mirrors Mongoose enum values so validation and model stay in sync.
 */

/** All supported series types — comic originating in Japan/Korea/China + animation */
const SERIES_TYPES = Object.freeze({
  MANGA:   'manga',
  MANHWA:  'manhwa',
  MANHUA:  'manhua',
  ANIME:   'anime',
  DONGHUA: 'donghua',
  MOVIE:   'movie',
  ONA:     'ona',
});

/** Broad category — drives which child content model applies */
const CONTENT_CATEGORY = Object.freeze({
  COMIC:     'comic',      // manga / manhwa / manhua → has Chapters
  ANIMATION: 'animation',  // anime / donghua        → has Seasons + Episodes
});

/** Map series type → its content category */
const SERIES_TYPE_CATEGORY = Object.freeze({
  manga:   CONTENT_CATEGORY.COMIC,
  manhwa:  CONTENT_CATEGORY.COMIC,
  manhua:  CONTENT_CATEGORY.COMIC,
  anime:   CONTENT_CATEGORY.ANIMATION,
  donghua: CONTENT_CATEGORY.ANIMATION,
  movie:   CONTENT_CATEGORY.ANIMATION,
  ona:     CONTENT_CATEGORY.ANIMATION,
});

/** Publication / airing status — shared by series, seasons, and episodes */
const SERIES_STATUS = Object.freeze({
  ONGOING:   'ongoing',
  COMPLETED: 'completed',
  HIATUS:    'hiatus',
  CANCELLED: 'cancelled',
});

/** Supported stream quality labels */
const STREAM_QUALITIES = Object.freeze(['360p', '480p', '720p', '1080p']);

// ── Legacy aliases (keep for backwards compatibility) ─────────────────────────
const MANGA_TYPES  = SERIES_TYPES;
const MANGA_STATUS = SERIES_STATUS;

module.exports = {
  SERIES_TYPES,
  CONTENT_CATEGORY,
  SERIES_TYPE_CATEGORY,
  SERIES_STATUS,
  STREAM_QUALITIES,
  // legacy
  MANGA_TYPES,
  MANGA_STATUS,
};
