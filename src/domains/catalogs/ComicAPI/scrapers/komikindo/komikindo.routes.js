'use strict';

const { Router } = require('express');
const ctrl = require('./komikindo.controller');

const router = Router();

router.get('/latest',              ctrl.latest);
router.get('/latest/:page',        ctrl.latest);
router.get('/populer',             ctrl.populer);
router.get('/populer/:page',       ctrl.populer);
router.get('/list',                ctrl.list);
router.get('/library',             ctrl.library);
router.get('/genres',              ctrl.genres);
router.get('/config',              ctrl.config);
router.get('/search/:query',       ctrl.search);
router.get('/search/:query/:page', ctrl.search);
router.get('/detail/:slug',        ctrl.detail);
router.get('/chapter/:slug',       ctrl.chapter);

module.exports = router;
