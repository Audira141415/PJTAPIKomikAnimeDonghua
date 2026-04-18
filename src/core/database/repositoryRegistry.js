// ── Identity Domain ──────────────────────────────────────────────────────
const authRepository     = require('@domains/identity/Auth/auth.repository');
const userRepository     = require('@domains/identity/User/user.repository');

// ── Catalog Domain ───────────────────────────────────────────────────────
const mangaRepository    = require('@domains/catalogs/services/manga/manga.repository');
const chapterRepository  = require('@domains/catalogs/services/chapter/chapter.repository');
const episodeRepository  = require('@domains/catalogs/services/episode/episode.repository');
const seasonRepository   = require('@domains/catalogs/services/season/season.repository');
const tagRepository      = require('@domains/catalogs/services/tag/tag.repository');

// ── Interaction Domain ───────────────────────────────────────────────────
const bookmarkRepository = require('@domains/interactions/Bookmark/bookmark.repository');
const historyRepository  = require('@domains/interactions/History/history.repository');
const collectionRepository = require('@domains/interactions/Collection/collection.repository');
const commentRepository  = require('@domains/interactions/Comment/comment.repository');
const reviewRepository   = require('@domains/interactions/Review/review.repository');
const ratingRepository   = require('@domains/interactions/models/rating.repository');

module.exports = {
  authRepository,
  userRepository,
  mangaRepository,
  chapterRepository,
  episodeRepository,
  seasonRepository,
  tagRepository,
  bookmarkRepository,
  historyRepository,
  collectionRepository,
  commentRepository,
  reviewRepository,
  ratingRepository,
};
