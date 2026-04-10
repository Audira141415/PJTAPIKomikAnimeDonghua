'use strict';

const router = require('express').Router();
const ctrl   = require('./dramabox.controller');

router.get('/search',         ctrl.search);
router.get('/latest',         ctrl.latest);
router.get('/trending',       ctrl.trending);
router.get('/detail',         ctrl.detail);
router.get('/stream',         ctrl.stream);
router.post('/auth/refresh',  ctrl.authRefresh);

module.exports = router;
