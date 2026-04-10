'use strict';

const router = require('express').Router();
const ctrl   = require('./donghub.controller');

router.get('/home',           ctrl.home);
router.get('/latest',         ctrl.latest);
router.get('/popular',        ctrl.popular);
router.get('/movie',          ctrl.movies);
router.get('/schedule',       ctrl.schedule);
router.get('/search/:query',  ctrl.search);
router.get('/genre/:slug',    ctrl.byGenre);
router.get('/list',           ctrl.list);
router.get('/detail/:slug',   ctrl.detail);
router.get('/episode/:slug',  ctrl.episode);

module.exports = router;
