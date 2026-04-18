'use strict';

const {              Manga, Bookmark, Rating              } = require('@models');
const cache = require('@core/utils/cache');

const invalidateTrendingCaches = async () => {
  await Promise.all([
    cache.delPattern('trending:bookmarks:*'),
    cache.delPattern('popular:*'),
    cache.delPattern('latest:*'),
  ]);
};

/**
 * Get trending manga by bookmarks in a given period
 * @param {string} period - 'week', 'month', 'all'
 * @param {number} limit - Number of results
 * @param {string} type - Original requested type or category
 * @returns {Promise<Object>}
 */
const getTrendingByBookmarks = async (period = 'week', limit = 10, type = null) => {
  // Resolve category aliases
  let categoryFilter = type;
  let typeFilter = null;
  let exclusions = null;

  if (type === 'anime') {
    categoryFilter = 'animation';
    typeFilter = { $nin: ['donghua'] };
    exclusions = { slug: { $not: /donghua|anichin|anix|dong-hua|china|chinese/ } };
  } else if (type === 'donghua') {
    categoryFilter = 'animation';
    typeFilter = 'donghua';
  } else if (type === 'manga' || type === 'manhwa' || type === 'manhua' || type === 'comic') {
    categoryFilter = 'comic';
    if (type === 'manhwa' || type === 'manhua') typeFilter = type;
  } else if (type === 'animation') {
    categoryFilter = 'animation';
  }

  const cacheKey = `trending:bookmarks:${type || 'all'}:${period}:${limit}`;
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
    cutoffDate = new Date('2000-01-01');
  }

  // Aggregate trending by recent bookmarks
  const trending = await Bookmark.aggregate([
    { $match: { createdAt: { $gte: cutoffDate } } },
    { $group: { _id: '$manga', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $lookup: { from: 'mangas', localField: '_id', foreignField: '_id', as: 'mangaData' } },
    { $unwind: '$mangaData' },
    {
      $match: {
        'mangaData.coverImage': { $exists: true, $ne: '', $ne: null },
        ...(categoryFilter ? { 'mangaData.contentCategory': categoryFilter } : {}),
        ...(typeFilter ? { 'mangaData.type': typeFilter } : {}),
        ...(exclusions ? { 'mangaData.slug': exclusions.slug } : {}),
      },
    },
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

  // FALLBACK: If fresh install has no bookmarks, fallback to top by views
  if (trending.length === 0) {
    const filter = Manga.getDiscoveryFilter({ category: categoryFilter, type: typeFilter });
    if (exclusions?.slug) filter.slug = exclusions.slug;
    const fallback = await Manga.find(filter)
      .sort({ views: -1 })
      .limit(limit)
      .select('title slug type contentCategory coverImage status rating views');
    
    const result = { data: fallback, meta: { period, limit, count: fallback.length, isFallback: true } };
    await cache.set(cacheKey, result, 60 * 60);
    return result;
  }

  const result = { data: trending, meta: { period, limit, count: trending.length } };
  await cache.set(cacheKey, result, 60 * 60);
  return result;
};

/**
 * Get most popular manga by a given metric
 * @param {string} metric - 'bookmarks', 'ratings', 'views', 'avg_rating'
 * @param {number} limit - Number of results
 * @param {string} type - Original requested type or category
 * @returns {Promise<Object>}
 */
const getPopularByMetric = async (metric = 'bookmarks', limit = 10, type = null) => {
  // Resolve category aliases
  let categoryFilter = type;
  let typeFilter = null;
  let exclusions = null;

  if (type === 'anime') {
    categoryFilter = 'animation';
    typeFilter = { $nin: ['donghua'] };
    exclusions = { slug: { $not: /donghua|anichin|anix|dong-hua|china|chinese/ } };
  } else if (type === 'donghua') {
    categoryFilter = 'animation';
    typeFilter = 'donghua';
  } else if (type === 'manga' || type === 'manhwa' || type === 'manhua' || type === 'comic') {
    categoryFilter = 'comic';
    if (type === 'manhwa' || type === 'manhua') typeFilter = type;
  } else if (type === 'animation') {
    categoryFilter = 'animation';
  }

  const cacheKey = `popular:${type || 'all'}:${metric}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  let result;

  if (metric === 'bookmarks') {
    result = await Bookmark.aggregate([
      { $group: { _id: '$manga', bookmarkCount: { $sum: 1 } } },
      { $sort: { bookmarkCount: -1 } },
      { $limit: limit },
      { $lookup: { from: 'mangas', localField: '_id', foreignField: '_id', as: 'mangaData' } },
      { $unwind: '$mangaData' },
      {
        $match: {
          'mangaData.coverImage': { $exists: true, $ne: '', $ne: null },
          ...(categoryFilter ? { 'mangaData.contentCategory': categoryFilter } : {}),
          ...(typeFilter ? { 'mangaData.type': typeFilter } : {}),
          ...(exclusions ? { 'mangaData.slug': exclusions.slug } : {}),
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
    result = await Rating.aggregate([
      { $group: { _id: '$series', ratingCount: { $sum: 1 }, avgScore: { $avg: '$score' } } },
      { $sort: { ratingCount: -1 } },
      { $limit: limit },
      { $lookup: { from: 'mangas', localField: '_id', foreignField: '_id', as: 'mangaData' } },
      { $unwind: '$mangaData' },
      {
        $match: {
          'mangaData.coverImage': { $exists: true, $ne: '', $ne: null },
          ...(categoryFilter ? { 'mangaData.contentCategory': categoryFilter } : {}),
          ...(typeFilter ? { 'mangaData.type': typeFilter } : {}),
          ...(exclusions ? { 'mangaData.slug': exclusions.slug } : {}),
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
    const filter = Manga.getDiscoveryFilter({ category: categoryFilter, type: typeFilter });
    if (exclusions?.slug) filter.slug = exclusions.slug;
    result = await Manga.find(filter)
      .sort({ views: -1 })
      .limit(limit)
      .select('title slug type contentCategory coverImage status rating views');
  } else if (metric === 'avg_rating') {
    const filter = Manga.getDiscoveryFilter({ category: categoryFilter, type: typeFilter });
    filter.ratingCount = { $gt: 0 };
    if (exclusions?.slug) filter.slug = exclusions.slug;
    result = await Manga.find(filter)
      .sort({ rating: -1 })
      .limit(limit)
      .select('title slug type contentCategory coverImage status rating views ratingCount');
  }

  // FALLBACK: If fresh install has no bookmarks/ratings, fallback to top by views
  if ((metric === 'bookmarks' || metric === 'ratings') && (!result || result.length === 0)) {
    const filter = Manga.getDiscoveryFilter({ category: categoryFilter, type: typeFilter });
    if (exclusions?.slug) filter.slug = exclusions.slug;
    result = await Manga.find(filter)
      .sort({ views: -1 })
      .limit(limit)
      .select('title slug type contentCategory coverImage status rating views');
  }

  const data = result || [];
  const payload = { data, meta: { metric, limit, count: data.length, isFallback: data.length > 0 && (!result || result.length === 0) } };
  await cache.set(cacheKey, payload, 60 * 60);
  return payload;
};

/**
 * Get latest manga (recently added or newly updated)
 * @param {number} limit
 * @param {string} type - Original requested type or category
 * @returns {Promise<Object>}
 */
const getLatestManga = async (limit = 10, type = null) => {
  // Resolve category aliases
  let categoryFilter = type;
  let typeFilter = null;
  let exclusions = null;

  if (type === 'anime') {
    categoryFilter = 'animation';
    typeFilter = { $nin: ['donghua'] };
    exclusions = { slug: { $not: /donghua|anichin|anix|dong-hua|china|chinese/ } };
  } else if (type === 'donghua') {
    categoryFilter = 'animation';
    typeFilter = 'donghua';
  } else if (type === 'manga' || type === 'manhwa' || type === 'manhua' || type === 'comic') {
    categoryFilter = 'comic';
    if (type === 'manhwa' || type === 'manhua') typeFilter = type;
  } else if (type === 'animation') {
    categoryFilter = 'animation';
  }

  const cacheKey = `latest:${type || 'all'}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const filter = Manga.getDiscoveryFilter({ category: categoryFilter, type: typeFilter });
  if (exclusions?.slug) filter.slug = exclusions.slug;
  const latest = await Manga.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('title slug type contentCategory coverImage status rating views createdAt');

  const payload = { data: latest, meta: { type: 'latest', limit, count: latest.length } };
  await cache.set(cacheKey, payload, 30 * 60);
  return payload;
};

module.exports = {
  getTrendingByBookmarks,
  getPopularByMetric,
  getLatestManga,
  invalidateTrendingCaches,
};

