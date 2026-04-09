'use strict';

const { Router } = require('express');
const ctrl = require('./samehadaku.controller');

const router = Router();

/**
 * Samehadaku API Routes
 * Base: /api/v1/samehadaku
 *
 * GET /home                   → Halaman utama (recent, batch, movie, top10)
 * GET /recent?page=1          → Anime terbaru
 * GET /search?q=...&page=1    → Pencarian anime
 * GET /ongoing?page=1         → Anime sedang tayang
 * GET /completed?page=1       → Anime sudah tamat
 * GET /popular?page=1         → Anime terpopuler
 * GET /movies?page=1          → Daftar movie
 * GET /list                   → Semua anime
 * GET /schedule               → Jadwal rilis mingguan
 * GET /genres                 → Semua genre
 * GET /genres/:genreId?page=1 → Anime berdasarkan genre
 * GET /batch?page=1           → Daftar batch anime
 * GET /anime/:animeId         → Detail anime + daftar episode
 * GET /episode/:episodeId     → Detail episode + link streaming/download
 * GET /batch/:batchId         → Detail batch download
 * GET /server/:serverId       → Link embed streaming dari server
 */

// ── Static routes ────────────────────────────────────────────────────────────
router.get('/home',      ctrl.home);
router.get('/recent',    ctrl.recent);
router.get('/search',    ctrl.search);
router.get('/ongoing',   ctrl.ongoing);
router.get('/completed', ctrl.completed);
router.get('/popular',   ctrl.popular);
router.get('/movies',    ctrl.movies);
router.get('/list',      ctrl.list);
router.get('/schedule',  ctrl.schedule);
router.get('/genres',    ctrl.genres);
router.get('/batch',     ctrl.batchList);

// ── Param routes (must be after static to avoid collisions) ─────────────────
router.get('/genres/:genreId',    ctrl.byGenre);
router.get('/anime/:animeId',     ctrl.animeDetail);
router.get('/episode/:episodeId', ctrl.episode);
router.get('/batch/:batchId',     ctrl.batch);
router.get('/server/:serverId',   ctrl.server);

module.exports = router;
