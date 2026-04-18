'use strict';

const { z } = require('zod');

const trendingQuery = z.object({
  type:     z.enum(['manga', 'manhwa', 'manhua', 'anime', 'donghua']).optional(),
  category: z.enum(['manga', 'comic', 'anime', 'donghua', 'animation']).optional(),
  period:   z.enum(['week', 'month', 'all']).default('week'),
  limit:    z.coerce.number().int().min(1).max(100).default(10),
});

const popularQuery = z.object({
  type:     z.enum(['manga', 'manhwa', 'manhua', 'anime', 'donghua']).optional(),
  category: z.enum(['manga', 'comic', 'anime', 'donghua', 'animation']).optional(),
  metric:   z.enum(['bookmarks', 'ratings', 'views', 'avg_rating']).default('bookmarks'),
  limit:    z.coerce.number().int().min(1).max(100).default(10),
});

const latestQuery = z.object({
  type:     z.enum(['manga', 'manhwa', 'manhua', 'anime', 'donghua']).optional(),
  category: z.enum(['manga', 'comic', 'anime', 'donghua', 'animation']).optional(),
  limit:    z.coerce.number().int().min(1).max(100).default(10),
});

module.exports = { trendingQuery, popularQuery, latestQuery };
