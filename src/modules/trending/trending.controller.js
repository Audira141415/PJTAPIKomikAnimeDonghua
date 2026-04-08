'use strict';

const { z } = require('zod');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const trendingService = require('./trending.service');

const trendingQuerySchema = z.object({
  period: z.enum(['week', 'month', 'all']).default('week'),
  limit:  z.coerce.number().int().min(1).max(100).default(10),
});

const popularQuerySchema = z.object({
  metric: z.enum(['bookmarks', 'ratings', 'views', 'avg_rating']).default('bookmarks'),
  limit:  z.coerce.number().int().min(1).max(100).default(10),
});

const latestQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * GET /api/v1/trending
 * Get trending manga by bookmarks in a given period
 */
const getTrending = catchAsync(async (req, res) => {
  const { period, limit } = trendingQuerySchema.parse(req.query);
  const payload = await trendingService.getTrendingByBookmarks(period, limit);
  return success(res, payload);
});

/**
 * GET /api/v1/popular
 * Get most popular manga by a given metric
 */
const getPopular = catchAsync(async (req, res) => {
  const { metric, limit } = popularQuerySchema.parse(req.query);
  const payload = await trendingService.getPopularByMetric(metric, limit);
  return success(res, payload);
});

/**
 * GET /api/v1/latest
 * Get latest manga (recently added)
 */
const getLatest = catchAsync(async (req, res) => {
  const { limit } = latestQuerySchema.parse(req.query);
  const payload = await trendingService.getLatestManga(limit);
  return success(res, payload);
});

module.exports = {
  getTrending,
  getPopular,
  getLatest,
};
