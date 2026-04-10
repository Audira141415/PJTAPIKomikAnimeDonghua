'use strict';

const router = require('express').Router();
const ctrl   = require('./alqanime.controller');

router.get('/home',           ctrl.home);
router.get('/schedule',       ctrl.schedule);
router.get('/popular',        ctrl.popular);
router.get('/list',           ctrl.list);
router.get('/ongoing',        ctrl.ongoing);
router.get('/completed',      ctrl.completed);
router.get('/movie',          ctrl.movies);
router.get('/search/:query',  ctrl.search);
router.get('/genres',         ctrl.genres);
router.get('/genre/:slug',    ctrl.byGenre);
router.get('/season/:slug',   ctrl.bySeason);
router.get('/detail/:slug',   ctrl.detail);

module.exports = router;
