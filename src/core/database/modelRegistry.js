// ── Identity Domain ──────────────────────────────────────────────────────
const User                   = require('@domains/identity/User/User');
const RefreshToken           = require('@domains/identity/Auth/RefreshToken');
const PasswordResetToken     = require('@domains/identity/Auth/PasswordResetToken');
const EmailVerificationToken = require('@domains/identity/Auth/EmailVerificationToken');

// ── Catalog Domain ───────────────────────────────────────────────────────
const Manga                  = require('@domains/catalogs/models/Manga');
const Chapter                = require('@domains/catalogs/models/Chapter');
const Season                 = require('@domains/catalogs/models/Season');
const Episode                = require('@domains/catalogs/models/Episode');
const Tag                    = require('@domains/catalogs/models/Tag');

// ── Metrics Domain ────────────────────────────────────────────────────────
const ClientApp               = require('@domains/metrics/models/ClientApp');
const UsageLog                = require('@domains/metrics/models/UsageLog');

// ── Interactions Domain ───────────────────────────────────────────────────
const Bookmark               = require('@domains/interactions/models/Bookmark');
const History                = require('@domains/interactions/models/History');
const Rating                 = require('@domains/interactions/models/Rating');
const Comment                = require('@domains/interactions/models/Comment');
const Review                 = require('@domains/interactions/models/Review');
const Collection             = require('@domains/interactions/models/Collection');

// ── Infrastructure (ScraperFoundation) ──────────────────────────────────
const SourceFeed             = require('@infrastructure/scraper/models/SourceFeed');
const RawSnapshot             = require('@infrastructure/scraper/models/RawSnapshot');
const SyncRun                 = require('@infrastructure/scraper/models/SyncRun');

module.exports = {
  User,
  RefreshToken,
  PasswordResetToken,
  EmailVerificationToken,
  Manga,
  Chapter,
  Season,
  Episode,
  Bookmark,
  History,
  Rating,
  Comment,
  Review,
  Tag,
  Collection,
  SourceFeed,
  RawSnapshot,
  SyncRun,
  ClientApp,
  UsageLog,
};
