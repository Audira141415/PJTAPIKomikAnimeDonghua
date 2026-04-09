'use strict';

const { Router } = require('express');
const ctrl = require('./westmanga.controller');

const router = Router();

router.get('/home',       ctrl.home);
router.get('/genres',     ctrl.genres);
router.get('/list',       ctrl.list);
router.get('/latest',     ctrl.latest);
router.get('/popular',    ctrl.popular);
router.get('/ongoing',    ctrl.ongoing);
router.get('/completed',  ctrl.completed);
router.get('/manga',      ctrl.manga);
router.get('/manhua',     ctrl.manhua);
router.get('/manhwa',     ctrl.manhwa);
router.get('/az',         ctrl.az);
router.get('/za',         ctrl.za);
router.get('/added',      ctrl.added);
router.get('/colored',    ctrl.colored);
router.get('/projects',   ctrl.projects);
router.get('/genre/:id',  ctrl.genre);
router.get('/search',     ctrl.search);
router.get('/detail/:slug',  ctrl.detail);
router.get('/chapter/:slug', ctrl.chapter);

module.exports = router;
