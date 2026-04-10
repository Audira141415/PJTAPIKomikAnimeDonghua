'use strict';

const router  = require('express').Router();
const ctrl    = require('./stream.controller');

router.get('/latest',          ctrl.latest);
router.get('/latest/:page',    ctrl.latest);
router.get('/popular',         ctrl.popular);
router.get('/search/:query',   ctrl.search);
router.get('/anime/:slug',     ctrl.animeDetail);
router.get('/episode/:slug',   ctrl.episode);
router.get('/movie',           ctrl.movies);
router.get('/movie/:page',     ctrl.movies);
router.get('/list',            ctrl.list);
router.get('/genres',          ctrl.genres);
router.get('/genres/:slug',    ctrl.byGenre);
router.get('/genres/:slug/:page', ctrl.byGenre);

module.exports = router;
