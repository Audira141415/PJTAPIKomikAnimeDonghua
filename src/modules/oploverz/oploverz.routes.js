'use strict';

const { Router } = require('express');
const ctrl = require('./oploverz.controller');
const router = Router();

router.get('/home',             ctrl.home);
router.get('/schedule',         ctrl.schedule);
router.get('/ongoing',          ctrl.ongoing);
router.get('/completed',        ctrl.completed);
router.get('/list',             ctrl.list);
router.get('/search/:query',    ctrl.search);
router.get('/anime/:slug',      ctrl.anime);
router.get('/episode/:slug',    ctrl.episode);

module.exports = router;
