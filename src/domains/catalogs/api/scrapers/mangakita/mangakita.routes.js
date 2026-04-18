'use strict';

const { Router } = require('express');
const c = require('./mangakita.controller');

const router = Router();

/**
 * Mangakita Routes — /api/v1/comic/mangakita
 */
router.get('/home',                c.home);
router.get('/list',                c.list);
router.get('/projects',            c.projects);
router.get('/projects/:page',      c.projects);
router.get('/daftar-manga',        c.daftarManga);
router.get('/daftar-manga/:page',  c.daftarManga);
router.get('/genres',              c.genres);
router.get('/genres/:slug',        c.byGenre);
router.get('/genres/:slug/:page',  c.byGenre);
router.get('/rekomendasi',         c.rekomendasi);
router.get('/search/:query',       c.search);
router.get('/search/:query/:page', c.search);
router.get('/detail/:slug',        c.detail);
router.get('/chapter/:slug',       c.chapter);

module.exports = router;
