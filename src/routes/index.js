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
const samehadakuRoutes = require('../modules/samehadaku/samehadaku.routes');
const animasuRoutes    = require('../modules/animasu/animasu.routes');
const kusonimeRoutes   = require('../modules/kusonime/kusonime.routes');
const anoboyRoutes     = require('../modules/anoboy/anoboy.routes');
const animesailRoutes  = require('../modules/animesail/animesail.routes');
const oploverz         = require('../modules/oploverz/oploverz.routes');
const stream           = require('../modules/stream/stream.routes');
const animekuindo      = require('../modules/animekuindo/animekuindo.routes');
const nimegami         = require('../modules/nimegami/nimegami.routes');
const alqanime         = require('../modules/alqanime/alqanime.routes');
const donghub          = require('../modules/donghub/donghub.routes');
const winbu            = require('../modules/winbu/winbu.routes');
const kuramanime       = require('../modules/kuramanime/kuramanime.routes');
const dramabox         = require('../modules/dramabox/dramabox.routes');
const drachin          = require('../modules/drachin/drachin.routes');
const createContentRouter = require('../modules/content-db/createContentRouter');
const jobsRoutes       = require('../modules/jobs/jobs.routes');
const clientUsageRoutes = require('../modules/client-usage/clientUsage.routes');
const trendingRoutes = require('../modules/trending/trending.routes');
const collectionRoutes = require('../modules/collection/collection.routes');
const comicRoutes = require('../modules/comic/comic.routes');
const collectionController = require('../modules/collection/collection.controller');
const proxyRoutes = require('../modules/proxy/proxy.routes');

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
router.use('/donghua',    donghuaRoutes);
router.use('/anime',      otakudesuRoutes);
router.use('/samehadaku', samehadakuRoutes);
router.use('/animasu',    animasuRoutes);
router.use('/kusonime',   kusonimeRoutes);
router.use('/anoboy',     anoboyRoutes);
router.use('/animesail',  animesailRoutes);
router.use('/oploverz',   oploverz);
router.use('/stream',     stream);
router.use('/animekuindo',animekuindo);
router.use('/nimegami',   nimegami);
router.use('/alqanime',   alqanime);
router.use('/donghub',    donghub);
router.use('/winbu',      winbu);
router.use('/kura',       kuramanime);
router.use('/dramabox',   dramabox);
router.use('/drachin',    drachin);
router.use('/jobs',      jobsRoutes);
router.use('/client-usage', clientUsageRoutes);
router.use('/collections', collectionRoutes);
router.use('/comic',       comicRoutes);   // ← /api/v1/comic/* unified comic endpoints
router.use('/image',       proxyRoutes);   // ← Image proxy endpoint

// ── Per-type DB routes ────────────────────────────────────────────────────────
router.use('/manga-db',   createContentRouter('manga'));
router.use('/manhwa-db',  createContentRouter('manhwa'));
router.use('/manhua-db',  createContentRouter('manhua'));
router.use('/anime-db',   createContentRouter('anime'));
router.use('/donghua-db', createContentRouter('donghua'));

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
