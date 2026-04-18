'use strict';

const router  = require('express').Router();
const ctrl    = require('./nimegami.controller');

router.get('/home',                ctrl.home);
router.get('/search/:query',       ctrl.search);
router.get('/detail/:slug',        ctrl.detail);
router.get('/anime-list',          ctrl.animeList);
router.get('/genre/list',          ctrl.genreList);
router.get('/genre/:slug',         ctrl.byGenre);
router.get('/seasons/list',        ctrl.seasonList);
router.get('/seasons/:slug',       ctrl.bySeason);
router.get('/type/list',           ctrl.typeList);
router.get('/type/:slug',          ctrl.byType);
router.get('/j-drama',             ctrl.jDrama);
router.get('/live-action',         ctrl.liveAction);
router.get('/live-action/:slug',   ctrl.liveDetail);
router.get('/drama/:slug',         ctrl.drama);

module.exports = router;
