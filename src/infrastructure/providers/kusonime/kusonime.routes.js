'use strict';

const { Router } = require('express');
const ctrl = require('./kusonime.controller');

const router = Router();

/**
 * Kusonime API Routes
 * Base: /api/v1/kusonime
 *
 * GET /latest?page=1                  → Update terbaru
 * GET /all-anime?page=1               → List semua anime (A-Z)
 * GET /movie?page=1                   → List movie (A-Z)
 * GET /type/:type?page=1              → List per tipe (ova, ona, special)
 * GET /all-genres                     → Semua genre
 * GET /all-seasons                    → Semua musim/tahun rilis
 * GET /search/:query?page=1           → Pencarian anime
 * GET /genre/:slug?page=1             → Anime per genre
 * GET /season/:season/:year?page=1    → Anime per musim
 * GET /detail/:slug                   → Detail anime + link download
 */

// Static
router.get('/latest',       ctrl.latest);
router.get('/all-anime',    ctrl.allAnime);
router.get('/movie',        ctrl.movies);
router.get('/all-genres',   ctrl.allGenres);
router.get('/all-seasons',  ctrl.allSeasons);

// Param
router.get('/type/:type',               ctrl.byType);
router.get('/search/:query',            ctrl.search);
router.get('/genre/:slug',              ctrl.byGenre);
router.get('/season/:season/:year',     ctrl.bySeason);
router.get('/detail/:slug',             ctrl.detail);

module.exports = router;
