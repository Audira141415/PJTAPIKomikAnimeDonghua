'use strict';

const { Router } = require('express');
const c = require('./bacakomik.controller');

const router = Router();

/**
 * BacaKomik Routes
 * Base: /api/v1/comic/bacakomik
 *
 * GET /latest                  Komik terbaru
 * GET /populer                 Komik populer
 * GET /top                     Top komik
 * GET /list                    Daftar semua komik
 * GET /search/:query           Cari komik
 * GET /genres                  Daftar genre
 * GET /genre/:genre            Komik by genre
 * GET /only/:type              Filter by type (manga/manhwa/manhua)
 * GET /recomen                 Rekomendasi
 * GET /komikberwarna/:page     Komik berwarna
 * GET /detail/:slug            Detail komik
 * GET /chapter/:slug           Baca chapter
 */
router.get('/latest',               c.latest);
router.get('/populer',              c.populer);
router.get('/top',                  c.top);
router.get('/list',                 c.list);
router.get('/genres',               c.genres);
router.get('/genre/:genre',         c.byGenre);
router.get('/only/:type',           c.byType);
router.get('/recomen',              c.recomen);
router.get('/komikberwarna/:page',  c.komikBerwarna);
router.get('/search/:query',        c.search);
router.get('/detail/:slug',         c.detail);
router.get('/chapter/:slug',        c.chapter);

module.exports = router;
