'use strict';

const { Router } = require('express');
const otakudesuController = require('./otakudesu.controller');

const router = Router();

/**
 * Otakudesu Anime API Routes
 * Base: /api/v1/anime
 *
 * GET /api/v1/anime/home                 → Halaman utama (terbaru, ongoing, completed)
 * GET /api/v1/anime/schedule             → Jadwal rilis anime per hari
 * GET /api/v1/anime/complete-anime       → Daftar anime tamat (per halaman)
 * GET /api/v1/anime/ongoing-anime        → Daftar anime sedang tayang
 * GET /api/v1/anime/genre               → Daftar semua genre
 * GET /api/v1/anime/genre/:slug          → Anime berdasarkan genre
 * GET /api/v1/anime/search/:keyword      → Pencarian anime
 * GET /api/v1/anime/episode/:slug        → Detail + link streaming episode
 * GET /api/v1/anime/batch/:slug          → Link download batch
 * GET /api/v1/anime/server/:serverId     → URL embed streaming server
 * GET /api/v1/anime/unlimited            → Semua judul anime (tanpa paginasi)
 * GET /api/v1/anime/anime/:slug          → Detail lengkap anime
 */

// ── Static routes (harus di atas /:slug) ───────────────────────────────────
router.get('/home',            otakudesuController.home);
router.get('/schedule',        otakudesuController.schedule);
router.get('/complete-anime',  otakudesuController.completeAnime);
router.get('/ongoing-anime',   otakudesuController.ongoingAnime);
router.get('/genre',           otakudesuController.allGenres);
router.get('/unlimited',       otakudesuController.allAnime);

// ── Param routes ────────────────────────────────────────────────────────────
router.get('/genre/:slug',     otakudesuController.byGenre);
router.get('/search/:keyword', otakudesuController.searchAnime);
router.get('/episode/:slug',   otakudesuController.episodeDetail);
router.get('/batch/:slug',     otakudesuController.batch);
router.get('/server/:serverId', otakudesuController.streamServer);
router.get('/anime/:slug',     otakudesuController.animeDetail);

module.exports = router;
