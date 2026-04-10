'use strict';

const router = require('express').Router();
const ctrl   = require('./drachin.controller');

router.get('/home',           ctrl.home);
router.get('/latest',         ctrl.latest);
router.get('/popular',        ctrl.popular);
router.get('/search/:query',  ctrl.search);
router.get('/detail/:slug',   ctrl.detail);
router.get('/episode/:slug',  ctrl.episode);

module.exports = router;
