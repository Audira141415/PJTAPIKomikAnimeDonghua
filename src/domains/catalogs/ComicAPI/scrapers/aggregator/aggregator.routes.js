'use strict';

const { Router } = require('express');
const ctrl = require('./aggregator.controller');

const router = Router();

/**
 * GET /comic/aggregator/sources
 *   List all registered scraper sources
 *
 * GET /comic/aggregator/latest?sources=all&page=1
 *   Latest comics merged from selected sources
 *   ?sources=all           → all 13 sources
 *   ?sources=bacakomik,komikindo → comma-separated subset
 *   ?page=1                → page number passed to each source
 *
 * GET /comic/aggregator/search?q=naruto&sources=all&page=1
 *   Search across selected sources
 */
router.get('/sources', ctrl.sources);
router.get('/latest',  ctrl.latest);
router.get('/search',  ctrl.search);

module.exports = router;
