'use strict';

const { Router } = require('express');
const { getTrending, getPopular, getLatest } = require('./trending.controller');

const router = Router();

/**
 * Public endpoints — no auth required
 */

/**
 * GET /api/v1/trending?period=week&limit=10
 * Get trending manga by recent bookmarks
 * 
 * Query params:
 *  - period: 'week' | 'month' | 'all' (default: 'week')
 *  - limit: 1-100 (default: 10)
 */
router.get('/trending', getTrending);

/**
 * GET /api/v1/popular?metric=bookmarks&limit=10
 * Get most popular manga by metric
 * 
 * Query params:
 *  - metric: 'bookmarks' | 'ratings' | 'views' | 'avg_rating' (default: 'bookmarks')
 *  - limit: 1-100 (default: 10)
 */
router.get('/popular', getPopular);

/**
 * GET /api/v1/latest?limit=10
 * Get latest manga (recently added)
 * 
 * Query params:
 *  - limit: 1-100 (default: 10)
 */
router.get('/latest', getLatest);

module.exports = router;
