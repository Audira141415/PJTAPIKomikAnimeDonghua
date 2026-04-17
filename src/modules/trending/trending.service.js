'use strict';

const { Manga, Bookmark, Rating } = require('../../models');
const cache = require('../../shared/utils/cache');

const invalidateTrendingCaches = async () => {
  await Promise.all([
    cache.delPattern('trending:bookmarks:*'),
    cache.delPattern('popular:*'),
    cache.delPattern('latest:manga:*'),
  ]);
};

/**
 * Get trending manga by bookmarks in a given period
 * @param {string} period - 'week', 'month', 'all'
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
const getTrendingByBookmarks = async (period = 'week', limit = 10) => {
  const cacheKey = `trending:bookmarks:${period}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // Calculate cutoff date based on period
  const now = new Date();
  let cutoffDate = new Date();
  if (period === 'week') {
    cutoffDate.setDate(cutoffDate.getDate() - 7);
  } else if (period === 'month') {
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
  } else if (period === 'all') {
    cutoffDate = new Date('2000-01-01'); // Very old date
  }

  // Aggregate trending by recent bookmarks
  const trending = await Bookmark.aggregate([
    { $match: { createdAt: { $gte: cutoffDate } } },
    { $group: { _id: '$manga', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $lookup: { from: 'mangas', localField: '_id', foreignField: '_id', as: 'mangaData' } },
    { $unwind: '$mangaData' },
    { $match: { 'mangaData.title': { $exists: true, $ne: '', $nin: ['Unknown', 'unknown', 'null', 'Null'] }, 'mangaData.coverImage': { $exists: true, $ne: '', $ne: null } } },
    {
      $project: {
        _id: 1,
        count: 1,
        title: '$mangaData.title',
        slug: '$mangaData.slug',
        type: '$mangaData.type',
        contentCategory: '$mangaData.contentCategory',
        coverImage: '$mangaData.coverImage',
        status: '$mangaData.status',
        rating: '$mangaData.rating',
        views: '$mangaData.views',
      },
    },
  ]);

  const result = { data: trending, meta: { period, limit, count: trending.length } };
  await cache.set(cacheKey, result, 60 * 60); // 1 hour cache for trending
  return result;
};

/**
 * Get most popular manga by a given metric
 * @param {string} metric - 'bookmarks', 'ratings', 'views', 'avg_rating'
 * @param {number} limit - Number of results
 * @returns {Promise<Array>}
 */
const getPopularByMetric = async (metric = 'bookmarks', limit = 10) => {
  const cacheKey = `popular:${metric}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  let result;

  if (metric === 'bookmarks') {
    // Count bookmarks per manga
    result = await Bookmark.aggregate([
      { $group: { _id: '$manga', bookmarkCount: { $sum: 1 } } },
      { $sort: { bookmarkCount: -1 } },
      { $limit: limit },
      { $lookup: { from: 'mangas', localField: '_id', foreignField: '_id', as: 'mangaData' } },
      { $unwind: '$mangaData' },
      {
        $match: {
          'mangaData.title': { $exists: true, $ne: '', $nin: ['Unknown', 'unknown', 'null', 'Null'] },
          'mangaData.coverImage': { $exists: true, $ne: '', $ne: null },
        },
      },
      {
        $project: {
          _id: 1,
          bookmarkCount: 1,
          title: '$mangaData.title',
          slug: '$mangaData.slug',
          type: '$mangaData.type',
          contentCategory: '$mangaData.contentCategory',
          coverImage: '$mangaData.coverImage',
          status: '$mangaData.status',
          rating: '$mangaData.rating',
          views: '$mangaData.views',
        },
      },
    ]);
  } else if (metric === 'ratings') {
    // Count ratings per manga
    result = await Rating.aggregate([
      { $group: { _id: '$series', ratingCount: { $sum: 1 }, avgScore: { $avg: '$score' } } },
      { $sort: { ratingCount: -1 } },
      { $limit: limit },
      { $lookup: { from: 'mangas', localField: '_id', foreignField: '_id', as: 'mangaData' } },
      { $unwind: '$mangaData' },
      {
        $match: {
          'mangaData.title': { $exists: true, $ne: '', $nin: ['Unknown', 'unknown', 'null', 'Null'] },
          'mangaData.coverImage': { $exists: true, $ne: '', $ne: null },
        },
      },
      {
        $project: {
          _id: 1,
          ratingCount: 1,
          avgScore: { $round: ['$avgScore', 2] },
          title: '$mangaData.title',
          slug: '$mangaData.slug',
          type: '$mangaData.type',
          contentCategory: '$mangaData.contentCategory',
          coverImage: '$mangaData.coverImage',
          status: '$mangaData.status',
          rating: '$mangaData.rating',
          views: '$mangaData.views',
        },
      },
    ]);
  } else if (metric === 'views') {
    // Top by views (direct from Manga model)
    result = await Manga.find(Manga.getDiscoveryFilter())
      .sort({ views: -1 })
      .limit(limit)
      .select('title slug type contentCategory coverImage status rating views');
  } else if (metric === 'avg_rating') {
    // Top by average rating
    result = await Manga.find({ ...Manga.getDiscoveryFilter(), ratingCount: { $gt: 0 } })
      .sort({ rating: -1 })
      .limit(limit)
      .select('title slug type contentCategory coverImage status rating views ratingCount');
  }

  const data = result || [];
  const payload = { data, meta: { metric, limit, count: data.length } };
  await cache.set(cacheKey, payload, 60 * 60); // 1 hour cache
  return payload;
};

/**
 * Get latest manga (recently added or newly updated)
 * @param {number} limit
 * @returns {Promise<Array>}
 */
const getLatestManga = async (limit = 10) => {
  const cacheKey = `latest:manga:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const latest = await Manga.find(Manga.getDiscoveryFilter())
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('title slug type contentCategory coverImage status rating views createdAt');

  const payload = { data: latest, meta: { type: 'latest', limit, count: latest.length } };
  await cache.set(cacheKey, payload, 30 * 60); // 30 min cache for latest
  return payload;
};

module.exports = {
  getTrendingByBookmarks,
  getPopularByMetric,
  getLatestManga,
  invalidateTrendingCaches,
};
