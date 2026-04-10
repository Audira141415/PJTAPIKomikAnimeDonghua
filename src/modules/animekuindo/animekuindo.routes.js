'use strict';

const router  = require('express').Router();
const ctrl    = require('./animekuindo.controller');

router.get('/home',              ctrl.home);
router.get('/schedule',          ctrl.schedule);
router.get('/latest',            ctrl.latest);
router.get('/popular',           ctrl.popular);
router.get('/movie',             ctrl.movies);
router.get('/search/:query',     ctrl.search);
router.get('/genres',            ctrl.genres);
router.get('/genres/:slug',      ctrl.byGenre);
router.get('/seasons',           ctrl.seasons);
router.get('/seasons/:slug',     ctrl.bySeason);
router.get('/detail/:slug',      ctrl.detail);
router.get('/episode/:slug',     ctrl.episode);

module.exports = router;
