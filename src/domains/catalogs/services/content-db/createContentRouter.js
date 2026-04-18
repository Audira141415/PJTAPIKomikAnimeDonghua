/**
 * createContentRouter(contentType)
 *
 * Factory that generates a fully-featured CRUD router scoped to a single
 * content type (manga | manhwa | manhua | anime | donghua).
 *
 * All requests automatically receive { type: contentType } so the underlying
 * manga service always filters by the correct type.
 *
 * Endpoints produced:
 *   GET    /                         – paginated list
 *   GET    /:slug                    – detail by slug
 *   POST   /                         – create  (admin)
 *   PUT    /:id                      – update  (admin)
 *   DELETE /:id                      – delete  (admin)
 *   PATCH  /:id/rate                 – submit rating (auth user)
 *   GET    /:id/recommendations      – recommendations
 *
 *   Comic types  (manga | manhwa | manhua):
 *   GET    /:id/chapters             – chapter list
 *
 *   Animation types (anime | donghua):
 *   GET    /:id/seasons              – season list
 *   GET    /:id/episodes             – episode list
 */

const { Router }           = require('express');
const mangaController      = require('../manga/manga.controller');
const chapterController    = require('../chapter/chapter.controller');
const seasonController     = require('../season/season.controller');
const episodeController    = require('../episode/episode.controller');
const { authenticate, authorize } = require('@auth/auth.middleware');
const { uploadCover }      = require('@middlewares/upload.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');
const { userActionLimiter }= require('@middlewares/rateLimiter.middleware');

const COMIC_TYPES     = new Set(['manga', 'manhwa', 'manhua']);
const ANIMATION_TYPES = new Set(['anime', 'donghua']);

function createContentRouter(contentType) {
  const router = Router();

  // Inject content type into every request on this sub-router
  router.use((req, _res, next) => {
    req.query.type = contentType;   // used by getAll
    next();
  });

  // ── Public routes ──────────────────────────────────────────────────────────
  router.get('/', mangaController.getAll);
  router.get('/:slug', mangaController.getBySlug);
  router.get('/:id/recommendations', validateObjectId('id'), mangaController.recommendations);

  // ── Admin routes ───────────────────────────────────────────────────────────
  router.post(
    '/',
    authenticate,
    authorize('admin'),
    uploadCover,
    (req, _res, next) => {
      // Force type so admin cannot accidentally create wrong type
      req.body.type = contentType;
      next();
    },
    mangaController.create,
  );

  router.put(
    '/:id',
    authenticate,
    authorize('admin'),
    validateObjectId('id'),
    uploadCover,
    mangaController.update,
  );

  router.delete(
    '/:id',
    authenticate,
    authorize('admin'),
    validateObjectId('id'),
    mangaController.remove,
  );

  // ── Rating (authenticated user) ────────────────────────────────────────────
  router.patch(
    '/:id/rate',
    authenticate,
    userActionLimiter,
    validateObjectId('id'),
    mangaController.rate,
  );

  // ── Type-specific nested routes ────────────────────────────────────────────
  if (COMIC_TYPES.has(contentType)) {
    router.get('/:id/chapters', validateObjectId('id'), chapterController.getByManga);
  }

  if (ANIMATION_TYPES.has(contentType)) {
    router.get('/:id/seasons',  validateObjectId('id'), seasonController.getBySeries);
    router.get('/:id/episodes', validateObjectId('id'), episodeController.getBySeries);
  }

  return router;
}

module.exports = createContentRouter;
