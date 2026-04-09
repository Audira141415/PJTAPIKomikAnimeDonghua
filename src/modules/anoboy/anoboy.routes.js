'use strict';

const { Router } = require('express');
const ctrl = require('./anoboy.controller');

const router = Router();

/**
 * Anoboy API Routes
 * Base: /api/v1/anoboy
 *
 * GET /home?page=1                    → Halaman home (rilisan terbaru)
 * GET /search/:keyword?page=1         → Pencarian anime
 * GET /anime/:slug                    → Detail anime + daftar episode
 * GET /episode/:slug                  → Detail episode (streaming)
 * GET /az-list?page=1&show=A          → Daftar A-Z
 * GET /list?page=1&status=...         → Daftar anime dengan filter
 * GET /genres                         → Semua genre
 * GET /genre/:slug?page=1             → Anime per genre
 */

// Static
router.get('/home',    ctrl.home);
router.get('/az-list', ctrl.azList);
router.get('/list',    ctrl.list);
router.get('/genres',  ctrl.genres);

// Param
router.get('/search/:keyword',  ctrl.search);
router.get('/anime/:slug',      ctrl.anime);
router.get('/episode/:slug',    ctrl.episode);
router.get('/genre/:slug',      ctrl.byGenre);

module.exports = router;
