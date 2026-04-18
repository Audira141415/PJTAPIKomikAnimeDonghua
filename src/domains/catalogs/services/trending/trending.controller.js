'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const trendingService = require('./trending.service');
const { trendingQuery: trendingQuerySchema, popularQuery: popularQuerySchema, latestQuery: latestQuerySchema } = require('./trending.validation');

/**
 * GET /api/v1/trending
 * Get trending manga by bookmarks in a given period
 */
const getTrending = catchAsync(async (req, res) => {
  const { period, limit, type, category } = trendingQuerySchema.parse(req.query);
  const filterType = category || type;
  const payload = await trendingService.getTrendingByBookmarks(period, limit, filterType);
  return success(res, payload);
});

/**
 * GET /api/v1/popular
 * Get most popular manga by a given metric
 */
const getPopular = catchAsync(async (req, res) => {
  const { metric, limit, type, category } = popularQuerySchema.parse(req.query);
  const filterType = category || type;
  const payload = await trendingService.getPopularByMetric(metric, limit, filterType);
  return success(res, payload);
});

/**
 * GET /api/v1/latest
 * Get latest manga (recently added)
 */
const getLatest = catchAsync(async (req, res) => {
  const { limit, type, category } = latestQuerySchema.parse(req.query);
  const filterType = category || type;
  const payload = await trendingService.getLatestManga(limit, filterType);
  return success(res, payload);
});

module.exports = {
  getTrending,
  getPopular,
  getLatest,
};
