'use strict';

const { Router } = require('express');
const c = require('./komikstation.controller');

const router = Router();

/**
 * Komikstation Routes
 * Base: /api/v1/comic/komikstation
 *
 * GET /home                           Homepage
 * GET /list?type=&status=&order=&page= Daftar komik dengan filter
 * GET /popular?page=                  Komik populer
 * GET /recommendation                 Rekomendasi
 * GET /top-weekly                     Top weekly
 * GET /ongoing?page=                  Komik ongoing
 * GET /az-list/:letter?page=          Daftar A-Z
 * GET /genres                         Daftar genre
 * GET /genre/:slug/:page?             Komik by genre
 * GET /search/:query/:page?           Cari komik
 * GET /manga/:slug                    Detail manga
 * GET /chapter/:slug                  Baca chapter
 */
router.get('/home',               c.home);
router.get('/list',               c.list);
router.get('/popular',            c.popular);
router.get('/recommendation',     c.recommendation);
router.get('/top-weekly',         c.topWeekly);
router.get('/ongoing',            c.ongoing);
router.get('/genres',             c.genres);
router.get('/az-list/:letter',    c.azList);
router.get('/genre/:slug',        c.byGenre);
router.get('/genre/:slug/:page',  c.byGenre);
router.get('/search/:query',      c.searchComics);
router.get('/search/:query/:page',c.searchComics);
router.get('/manga/:slug',        c.mangaDetail);
router.get('/chapter/:slug',      c.chapterRead);

module.exports = router;
