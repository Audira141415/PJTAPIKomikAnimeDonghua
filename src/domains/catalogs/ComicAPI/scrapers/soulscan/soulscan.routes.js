'use strict';

const { Router } = require('express');
const ctrl = require('./soulscan.controller');

const router = Router();

router.get('/home',                   ctrl.home);
router.get('/latest',                 ctrl.latest);
router.get('/latest/:page',           ctrl.latest);
router.get('/popular',                ctrl.popular);
router.get('/popular/:page',          ctrl.popular);
router.get('/list',                   ctrl.list);
router.get('/list/:page',             ctrl.list);
router.get('/genres',                 ctrl.genres);
router.get('/genre/:slug',            ctrl.genre);
router.get('/genre/:slug/:page',      ctrl.genre);
router.get('/search/:query',          ctrl.search);
router.get('/search/:query/:page',    ctrl.search);
router.get('/detail/:slug',           ctrl.detail);
router.get('/chapter/:slug',          ctrl.chapter);

module.exports = router;
