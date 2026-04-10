'use strict';

const router = require('express').Router();
const ctrl   = require('./kuramanime.controller');

router.get('/home',                          ctrl.home);
router.get('/search/:keyword',               ctrl.search);
router.get('/anime/:id/:slug',               ctrl.animeDetail);
router.get('/watch/:id/:slug/:episode',      ctrl.watch);
router.get('/batch/:id/:slug/:batchId',      ctrl.batch);
router.get('/anime-list',                    ctrl.animeList);
router.get('/schedule',                      ctrl.schedule);
router.get('/quick/:type',                   ctrl.quick);
router.get('/properties/:prop',              ctrl.propertyList);
router.get('/properties/:prop/:slug',        ctrl.propertyDetail);

module.exports = router;
