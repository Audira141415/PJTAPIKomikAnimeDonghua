'use strict';

const { Router } = require('express');
const ctrl = require('./meganei.controller');

const router = Router();

router.get('/home',           ctrl.home);
router.get('/hot',            ctrl.hot);
router.get('/latest',         ctrl.latest);
router.get('/genres',         ctrl.genres);
router.get('/genre/:slug',    ctrl.genre);
router.get('/search',         ctrl.search);
router.get('/detail/:slug',   ctrl.detail);
router.get('/chapter/:slug',  ctrl.chapter);

module.exports = router;
