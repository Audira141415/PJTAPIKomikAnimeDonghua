'use strict';

const { Router } = require('express');
const ctrl = require('./animesail.controller');

const router = Router();

/**
 * AnimeSail API Routes
 * Base: /api/v1/animesail
 *
 * GET /home?page=1            → Featured / populer
 * GET /terbaru?page=1         → Anime terbaru / ongoing
 * GET /donghua?page=1         → Rilis terbaru Donghua
 * GET /movie?page=1           → Daftar film (movie)
 * GET /schedule               → Jadwal tayang harian
 * GET /list                   → Daftar semua judul (A-Z)
 * GET /search/:query          → Pencarian anime
 * GET /genres                 → Semua genre
 * GET /genre/:slug?page=1     → Anime per genre
 * GET /season/:slug?page=1    → Anime per musim
 * GET /studio/:slug?page=1    → Anime per studio
 * GET /detail/:slug           → Detail anime + daftar episode
 * GET /episode/:slug          → Stream & download episode
 */

// Static
router.get('/home',     ctrl.home);
router.get('/terbaru',  ctrl.terbaru);
router.get('/donghua',  ctrl.donghua);
router.get('/movie',    ctrl.movies);
router.get('/schedule', ctrl.schedule);
router.get('/list',     ctrl.list);
router.get('/genres',   ctrl.genres);

// Param
router.get('/search/:query',  ctrl.search);
router.get('/genre/:slug',    ctrl.byGenre);
router.get('/season/:slug',   ctrl.bySeason);
router.get('/studio/:slug',   ctrl.byStudio);
router.get('/detail/:slug',   ctrl.detail);
router.get('/episode/:slug',  ctrl.episode);

module.exports = router;
