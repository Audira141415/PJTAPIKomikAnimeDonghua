'use strict';

const { Router } = require('express');
const ctrl = require('./maid.controller');

const router = Router();

router.get('/list',             ctrl.list);
router.get('/api',              ctrl.api);
router.get('/latest',           ctrl.latest);
router.get('/manga/:slug',      ctrl.manga);
router.get('/chapter/:slug',    ctrl.chapter);
router.get('/genres',           ctrl.genres);
router.get('/genres/:slug',     ctrl.byGenre);
router.get('/search',           ctrl.search);

module.exports = router;
