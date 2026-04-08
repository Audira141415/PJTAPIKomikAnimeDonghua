const { Router } = require('express');

// ── Module routes (canonical paths) ──────────────────────────────────────────
const authRoutes     = require('../modules/auth/auth.routes');
const userRoutes     = require('../modules/user/user.routes');
const mangaRoutes    = require('../modules/manga/manga.routes');
const chapterRoutes  = require('../modules/chapter/chapter.routes');
const seasonRoutes   = require('../modules/season/season.routes');
const episodeRoutes  = require('../modules/episode/episode.routes');
const bookmarkRoutes = require('../modules/bookmark/bookmark.routes');
const historyRoutes  = require('../modules/history/history.routes');
const searchRoutes   = require('../modules/search/search.routes');
const commentRoutes  = require('../modules/comment/comment.routes');
const reviewRoutes   = require('../modules/review/review.routes');
const tagRoutes      = require('../modules/tag/tag.routes');
const donghuaRoutes    = require('../modules/donghua/donghua.routes');
const otakudesuRoutes  = require('../modules/otakudesu/otakudesu.routes');
const jobsRoutes       = require('../modules/jobs/jobs.routes');
const trendingRoutes = require('../modules/trending/trending.routes');
const collectionRoutes = require('../modules/collection/collection.routes');
const collectionController = require('../modules/collection/collection.controller');

// Controllers needed for convenience nested routes
const chapterController = require('../modules/chapter/chapter.controller');
const seasonController  = require('../modules/season/season.controller');
const episodeController = require('../modules/episode/episode.controller');
const { validateObjectId } = require('../middlewares/validateObjectId.middleware');

const router = Router();

router.use('/auth',      authRoutes);
router.use('/users',     userRoutes);
router.use('/mangas',    mangaRoutes);
router.use('/chapters',  chapterRoutes);
router.use('/seasons',   seasonRoutes);
router.use('/episodes',  episodeRoutes);
router.use('/bookmarks', bookmarkRoutes);
router.use('/histories', historyRoutes);
router.use('/search',    searchRoutes);
router.use('/comments',  commentRoutes);
router.use('/reviews',   reviewRoutes);
router.use('/tags',      tagRoutes);
router.use('/donghua',   donghuaRoutes);
router.use('/anime',     otakudesuRoutes);
router.use('/jobs',      jobsRoutes);
router.use('/collections', collectionRoutes);
router.use('/',          trendingRoutes); // ← Trending routes at root (/)

router.get(
	'/users/:userId/collections',
	validateObjectId('userId'),
	collectionController.getPublicByUser
);


// ── Convenience nested routes ─────────────────────────────────────────────────
// Comics:    GET /api/v1/mangas/:id/chapters
// Animation: GET /api/v1/mangas/:id/seasons
//            GET /api/v1/mangas/:id/episodes  (all eps, optional ?seasonId=)
router.get('/mangas/:id/chapters', validateObjectId('id'), chapterController.getByManga);
router.get('/mangas/:id/seasons',  validateObjectId('id'), seasonController.getBySeries);
router.get('/mangas/:id/episodes', validateObjectId('id'), episodeController.getBySeries);

module.exports = router;
