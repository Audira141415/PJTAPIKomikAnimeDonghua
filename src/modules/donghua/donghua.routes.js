const { Router } = require('express');
const donghuaController = require('./donghua.controller');

const router = Router();

/**
 * Donghua API Routes
 *
 * GET /api/v1/donghua/home                        → Home (latest + completed)
 * GET /api/v1/donghua/ongoing                     → Ongoing list
 * GET /api/v1/donghua/completed                   → Completed list
 * GET /api/v1/donghua/search?q=...                → Pencarian
 * GET /api/v1/donghua/genres                      → Daftar genre
 * GET /api/v1/donghua/genre/:genre                → By genre
 * GET /api/v1/donghua/year/:year                  → By season/tahun
 * GET /api/v1/donghua/episode/:episodeSlug        → Nonton episode
 * GET /api/v1/donghua/:slug                       → Detail
 */

// Static routes — must be BEFORE /:slug to avoid param collision
router.get('/home',      donghuaController.home);
router.get('/ongoing',   donghuaController.ongoing);
router.get('/completed', donghuaController.completed);
router.get('/search',    donghuaController.search);
router.get('/genres',    donghuaController.genres);
router.get('/genre/:genre', donghuaController.byGenre);
router.get('/year/:year',   donghuaController.byYear);
router.get('/episode/:episodeSlug', donghuaController.watchEpisode);

// Dynamic slug route
router.get('/:slug', donghuaController.detail);

module.exports = router;
