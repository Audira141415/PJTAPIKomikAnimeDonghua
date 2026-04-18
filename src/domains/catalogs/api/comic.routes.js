'use strict';

const { Router } = require('express');
const c = require('./comic.controller');
const { authenticate, authorize } = require('@auth/auth.middleware');
const { uploadCover } = require('@middlewares/upload.middleware');
const { validateObjectId } = require('@middlewares/validateObjectId.middleware');
const { userActionLimiter } = require('@middlewares/rateLimiter.middleware');

const router = Router();

// ── Aggregator (all sources unified) ─────────────────────────────────────────
router.use('/aggregator',   require('./scrapers/aggregator/aggregator.routes'));

// ── Scrapers (external sources) ───────────────────────────────────────────────
router.use('/bacakomik',    require('./scrapers/bacakomik/bacakomik.routes'));
router.use('/komikstation', require('./scrapers/komikstation/komikstation.routes'));
router.use('/mangakita',    require('./scrapers/mangakita/mangakita.routes'));
router.use('/maid',         require('./scrapers/maid/maid.routes'));
router.use('/komikindo',    require('./scrapers/komikindo/komikindo.routes'));
router.use('/soulscan',     require('./scrapers/soulscan/soulscan.routes'));
router.use('/bacaman',      require('./scrapers/bacaman/bacaman.routes'));
router.use('/meganei',      require('./scrapers/meganei/meganei.routes'));
router.use('/softkomik',    require('./scrapers/softkomik/softkomik.routes'));
router.use('/westmanga',    require('./scrapers/westmanga/westmanga.routes'));
router.use('/mangasusuku',  require('./scrapers/mangasusuku/mangasusuku.routes'));
router.use('/kiryuu',       require('./scrapers/kiryuu/kiryuu.routes'));
router.use('/cosmic',       require('./scrapers/cosmic/cosmic.routes'));

// ── Discovery & listing ───────────────────────────────────────────────────────
router.get('/terbaru',        c.terbaru);          // GET /comic/terbaru
router.get('/populer',        c.populer);          // GET /comic/populer
router.get('/trending',       c.trending);         // GET /comic/trending
router.get('/latest',         c.latest);           // GET /comic/latest
router.get('/random',         c.random);           // GET /comic/random
router.get('/homepage',       c.homepage);         // GET /comic/homepage
router.get('/recommendations',c.recommendations);  // GET /comic/recommendations

// ── Browse & filter ───────────────────────────────────────────────────────────
router.get('/browse',         c.browse);           // GET /comic/browse?type=&genre=&order=
router.get('/type/:type',     c.byType);           // GET /comic/type/manhwa
router.get('/genre/:genre',   c.byGenre);          // GET /comic/genre/action
router.get('/genres',         c.genres);           // GET /comic/genres
router.get('/berwarna/:page', c.berwarna);         // GET /comic/berwarna/1
router.get('/pustaka/:page',  c.pustaka);          // GET /comic/pustaka/1

// ── Search ────────────────────────────────────────────────────────────────────
router.get('/search',         c.search);           // GET /comic/search?q=naruto
router.get('/advanced-search',c.advancedSearch);   // GET /comic/advanced-search

// ── Pagination variants ───────────────────────────────────────────────────────
router.get('/unlimited',      c.unlimited);        // GET /comic/unlimited
router.get('/scroll',         c.scroll);           // GET /comic/scroll?offset=0
router.get('/infinite',       c.infinite);         // GET /comic/infinite?page=1

// ── Comic detail & chapters ───────────────────────────────────────────────────
router.get('/comic/:slug',               c.detail);            // GET /comic/comic/:slug
router.get('/chapter/:slug/navigation',  c.chapterNavigation); // GET /comic/chapter/:slug/navigation
router.get('/chapter/:slug',             c.chapterRead);       // GET /comic/chapter/:slug

// ── Stats & monitoring ────────────────────────────────────────────────────────
router.get('/stats',       c.stats);       // GET /comic/stats
router.get('/stats/source-items', c.statsSourceItems); // GET /comic/stats/source-items
router.get('/stats/distribution', c.statsDistribution); // GET /comic/stats/distribution
router.get('/fullstats',   c.fullstats);   // GET /comic/fullstats
router.get('/analytics',   c.analytics);  // GET /comic/analytics
router.get('/comparison',  c.comparison); // GET /comic/comparison
router.get('/realtime',    c.realtime);   // GET /comic/realtime
router.get('/health',      c.health);     // GET /comic/health

// ── Auth-required (demo) ──────────────────────────────────────────────────────
router.get('/favorites', authenticate, c.recommendations); // GET /comic/favorites (needs auth)

// ── Admin CRUD ────────────────────────────────────────────────────────────────
router.post('/',          authenticate, authorize('admin'), uploadCover, c.create);                        // POST   /comic
router.put('/:id',        authenticate, authorize('admin'), validateObjectId('id'), uploadCover, c.update); // PUT    /comic/:id
router.delete('/:id',     authenticate, authorize('admin'), validateObjectId('id'), c.remove);              // DELETE /comic/:id
router.patch('/:id/rate', authenticate, userActionLimiter,  validateObjectId('id'), c.rate);                // PATCH  /comic/:id/rate

module.exports = router;
