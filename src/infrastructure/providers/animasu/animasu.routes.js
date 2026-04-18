'use strict';

const { Router } = require('express');
const ctrl = require('./animasu.controller');

const router = Router();

/**
 * Animasu API Routes
 * Base: /api/v1/animasu
 *
 * GET /home?page=1                    → Halaman utama
 * GET /popular?page=1                 → Anime populer
 * GET /movies?page=1                  → Anime movie
 * GET /ongoing?page=1                 → Anime sedang tayang
 * GET /completed?page=1               → Anime sudah tamat
 * GET /latest?page=1                  → Anime terbaru
 * GET /search/:keyword?page=1         → Pencarian anime
 * GET /animelist?letter=A&page=1      → Daftar anime A-Z
 * GET /advanced-search?genres=...     → Pencarian lanjutan
 * GET /genres                         → Semua genre
 * GET /genre/:slug?page=1             → Anime per genre
 * GET /characters                     → Daftar tipe karakter
 * GET /character/:slug?page=1         → Anime per karakter
 * GET /schedule                       → Jadwal rilis
 * GET /detail/:slug                   → Detail anime
 * GET /episode/:slug                  → Detail episode (stream + download)
 */

// Static
router.get('/home',            ctrl.home);
router.get('/popular',         ctrl.popular);
router.get('/movies',          ctrl.movies);
router.get('/ongoing',         ctrl.ongoing);
router.get('/completed',       ctrl.completed);
router.get('/latest',          ctrl.latest);
router.get('/animelist',       ctrl.animeList);
router.get('/advanced-search', ctrl.advSearch);
router.get('/genres',          ctrl.genres);
router.get('/characters',      ctrl.characters);
router.get('/schedule',        ctrl.schedule);

// Param routes
router.get('/search/:keyword',    ctrl.searchAnime);
router.get('/genre/:slug',        ctrl.byGenre);
router.get('/character/:slug',    ctrl.byCharacter);
router.get('/detail/:slug',       ctrl.detail);
router.get('/episode/:slug',      ctrl.episode);

module.exports = router;
