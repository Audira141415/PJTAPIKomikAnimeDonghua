const { Router } = require('express');

// ── Identity & Auth Domains ──────────────────────────────────────────────
const authRoutes     = require('@identity/Auth/auth.routes');
const userRoutes     = require('@identity/User/user.routes');
const adminRoutes    = require('@identity/Management/admin.routes');

// ── Catalog & Content Domains ────────────────────────────────────────────
const mangaRoutes    = require('@catalogs/services/manga/manga.routes');
const chapterRoutes  = require('@catalogs/services/chapter/chapter.routes');
const seasonRoutes   = require('@catalogs/services/season/season.routes');
const episodeRoutes  = require('@catalogs/services/episode/episode.routes');
const tagRoutes      = require('@catalogs/services/tag/tag.routes');
const donghuaRoutes  = require('@catalogs/services/donghua/donghua.routes');
const searchRoutes   = require('@catalogs/services/search/search.routes');
const trendingRoutes = require('@catalogs/services/trending/trending.routes');
const streamRoutes   = require('@catalogs/services/stream/stream.routes');
const comicRoutes    = require('@catalogs/ComicAPI/comic.routes');
const createContentRouter = require('@catalogs/services/content-db/createContentRouter');

// ── Scraper Infrastructure (Providers) ───────────────────────────────────
const otakudesuRoutes  = require('@infrastructure/providers/otakudesu/otakudesu.routes');
const samehadakuRoutes = require('@infrastructure/providers/samehadaku/samehadaku.routes');
const animasuRoutes    = require('@infrastructure/providers/animasu/animasu.routes');
const kusonimeRoutes   = require('@infrastructure/providers/kusonime/kusonime.routes');
const anoboyRoutes     = require('@infrastructure/providers/anoboy/anoboy.routes');
const animesailRoutes  = require('@infrastructure/providers/animesail/animesail.routes');
const oploverzRoutes   = require('@infrastructure/providers/oploverz/oploverz.routes');
const animekuindoRoutes = require('@infrastructure/providers/animekuindo/animekuindo.routes');
const nimegamiRoutes   = require('@infrastructure/providers/nimegami/nimegami.routes');
const alqanimeRoutes   = require('@infrastructure/providers/alqanime/alqanime.routes');
const donghubRoutes    = require('@infrastructure/providers/donghub/donghub.routes');
const winbuRoutes      = require('@infrastructure/providers/winbu/winbu.routes');
const kuramanimeRoutes = require('@infrastructure/providers/kuramanime/kuramanime.routes');
const dramaboxRoutes   = require('@infrastructure/providers/dramabox/dramabox.routes');
const drachinRoutes    = require('@infrastructure/providers/drachin/drachin.routes');

// ── Interactions & Metrics ────────────────────────────────────────────────
const bookmarkRoutes = require('@interactions/Bookmark/bookmark.routes');
const historyRoutes  = require('@interactions/History/history.routes');
const commentRoutes  = require('@interactions/Comment/comment.routes');
const reviewRoutes   = require('@interactions/Review/review.routes');
const collectionRoutes = require('@interactions/Collection/collection.routes');
const clientUsageRoutes = require('@metrics/Usage/clientUsage.routes');

// ── Infrastructure & Apps ─────────────────────────────────────────────────
const jobsRoutes       = require('@apps/worker-scrapers/jobs.routes');
const proxyRoutes      = require('@infrastructure/proxy/proxy.routes');
const anilistRoutes    = require('@catalogs/services/anilist/anilist.routes');
const seoRoutes        = require('@catalogs/services/seo/seo.routes');
const sourceManagerRoutes = require('@source-manager/source.routes');
const curationRoutes      = require('@catalogs/services/curation/curation.routes');

const chapterController = require('@catalogs/services/chapter/chapter.controller');
const seasonController  = require('@catalogs/services/season/season.controller');
const episodeController = require('@catalogs/services/episode/episode.controller');
const collectionController = require('@interactions/Collection/collection.controller');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');

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
router.use('/oploverz',   oploverzRoutes);
router.use('/stream',     streamRoutes);
router.use('/animekuindo',animekuindoRoutes);
router.use('/nimegami',   nimegamiRoutes);
router.use('/alqanime',   alqanimeRoutes);
router.use('/donghub',    donghubRoutes);
router.use('/winbu',      winbuRoutes);
router.use('/kura',       kuramanimeRoutes);
router.use('/dramabox',   dramaboxRoutes);
router.use('/drachin',    drachinRoutes);
router.use('/jobs',      jobsRoutes);
router.use('/client-usage', clientUsageRoutes);
router.use('/collections', collectionRoutes);
router.use('/comic',       comicRoutes);   // ← /api/v1/comic/* unified comic endpoints
router.use('/image',       proxyRoutes);   // ← Image proxy endpoint
router.use('/anilist',     anilistRoutes); // ← AniList compatibility routes
router.use('/admin',       adminRoutes);   // ← Admin maintenance & audit
router.use('/seo',         seoRoutes);     // ← SEO & Sitemap
router.use('/sources',     sourceManagerRoutes); // ← Source Management CRUD
router.use('/curation',    curationRoutes);      // ← Content Curation & Spotlight
router.use('/catalog/manga', mangaRoutes);
router.use('/scraper',     require('@catalogs/ComicAPI/scrapers/aggregator/aggregator.routes')); // ← Re-mapped to new domain path

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
