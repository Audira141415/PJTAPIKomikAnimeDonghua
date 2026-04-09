'use strict';

const { Manga } = require('../../models');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const ApiError = require('../../shared/errors/ApiError');
const cache = require('../../shared/utils/cache');
const { paginate, paginateMeta } = require('../../shared/utils/paginate');
const mangaService = require('../manga/manga.service');
const mangaValidation = require('../manga/manga.validation');
const trendingService = require('../trending/trending.service');
const tagService = require('../tag/tag.service');
const chapterRepo = require('../../repositories/chapter.repository');
const { coverFileUrl } = require('../../middlewares/upload.middleware');
const { z } = require('zod');

// ── Shared query schemas ──────────────────────────────────────────────────────
const pageSchema = z.object({
  page:  z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const searchSchema = z.object({
  q:      z.string().min(1).max(200),
  type:   z.enum(['manga', 'manhwa', 'manhua']).optional(),
  genre:  z.string().optional(),
  status: z.enum(['ongoing', 'completed', 'hiatus']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

// ── Helper ────────────────────────────────────────────────────────────────────
const buildMangaSelect = 'title slug type contentCategory coverImage status rating views genres releasedOn';

// ============================================================================
//  GET /comic/terbaru  — Komik terbaru dengan pagination
// ============================================================================
const terbaru = catchAsync(async (req, res) => {
  const { page, limit } = pageSchema.parse(req.query);
  const cacheKey = `comic:terbaru:${page}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const filter = {};
  const [mangas, total] = await Promise.all([
    Manga.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments(filter),
  ]);
  const payload = { data: mangas, pagination: paginateMeta(total, currentPage, perPage) };
  await cache.set(cacheKey, payload, 5 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/populer  — Komik populer (by views), multi-source
// ============================================================================
const populer = catchAsync(async (req, res) => {
  const { limit } = pageSchema.parse(req.query);
  const payload = await trendingService.getPopularByMetric('views', limit);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/trending  — Trending berdasarkan bookmark activity
// ============================================================================
const trending = catchAsync(async (req, res) => {
  const period = z.enum(['week', 'month', 'all']).default('week').parse(req.query.period);
  const limit  = z.coerce.number().int().min(1).max(50).default(10).parse(req.query.limit);
  const payload = await trendingService.getTrendingByBookmarks(period, limit);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/latest  — Latest (alias getLatest service)
// ============================================================================
const latest = catchAsync(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);
  const payload = await trendingService.getLatestManga(limit);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/search?q=  — Pencarian dengan 3-method fallback
// ============================================================================
const search = catchAsync(async (req, res) => {
  const { q, type, genre, status, page, limit: limitVal } = searchSchema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limitVal);

  const cacheKey = `comic:search:${q}:${type}:${genre}:${status}:${currentPage}:${perPage}`;
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  // Method 1 — full-text search (fastest)
  let results = [];
  let total = 0;
  try {
    const filter = { $text: { $search: q } };
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    if (genre)  filter.genres = genre;

    [results, total] = await Promise.all([
      Manga.find(filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' }, rating: -1 })
        .skip(skip).limit(perPage).select(buildMangaSelect),
      Manga.countDocuments(filter),
    ]);
  } catch (_e) {
    results = [];
  }

  // Method 2 — regex fallback if full-text returns nothing
  if (results.length === 0) {
    const filter = { title: { $regex: q, $options: 'i' } };
    if (type)   filter.type   = type;
    if (status) filter.status = status;
    if (genre)  filter.genres = genre;

    [results, total] = await Promise.all([
      Manga.find(filter).sort({ rating: -1 }).skip(skip).limit(perPage).select(buildMangaSelect),
      Manga.countDocuments(filter),
    ]);
  }

  // Method 3 — genre-only fallback if still nothing
  if (results.length === 0 && genre) {
    const filter = { genres: genre };
    [results, total] = await Promise.all([
      Manga.find(filter).sort({ rating: -1 }).skip(skip).limit(perPage).select(buildMangaSelect),
      Manga.countDocuments(filter),
    ]);
  }

  const payload = {
    data: results,
    pagination: paginateMeta(total, currentPage, perPage),
    meta: { query: q, method: results.length > 0 ? 'matched' : 'empty' },
  };
  await cache.set(cacheKey, payload, 2 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/advanced-search  — Filter dengan banyak parameter
// ============================================================================
const advancedSearch = catchAsync(async (req, res) => {
  const schema = z.object({
    q:        z.string().optional(),
    type:     z.enum(['manga', 'manhwa', 'manhua']).optional(),
    genre:    z.string().optional(),
    status:   z.enum(['ongoing', 'completed', 'hiatus']).optional(),
    sortBy:   z.enum(['rating', 'views', 'createdAt', 'title']).default('createdAt'),
    order:    z.enum(['asc', 'desc']).default('desc'),
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(100).default(20),
  });
  const params = schema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(params.page, params.limit);

  const filter = {};
  if (params.q)      filter.$text  = { $search: params.q };
  if (params.type)   filter.type   = params.type;
  if (params.status) filter.status = params.status;
  if (params.genre)  filter.genres = params.genre;

  const sort = { [params.sortBy]: params.order === 'asc' ? 1 : -1 };

  const [results, total] = await Promise.all([
    Manga.find(filter).sort(sort).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments(filter),
  ]);

  const payload = {
    data: results,
    pagination: paginateMeta(total, currentPage, perPage),
    meta: { filters: params },
  };
  return success(res, payload);
});

// ============================================================================
//  GET /comic/browse  — Browse dengan filter type, order, genre
// ============================================================================
const browse = catchAsync(async (req, res) => {
  const schema = z.object({
    type:   z.enum(['manga', 'manhwa', 'manhua']).optional(),
    genre:  z.string().optional(),
    status: z.enum(['ongoing', 'completed', 'hiatus']).optional(),
    order:  z.enum(['latest', 'oldest', 'popular', 'rating', 'az', 'za']).default('latest'),
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(24),
  });
  const { type, genre, status, order, page, limit } = schema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const filter = {};
  if (type)   filter.type   = type;
  if (genre)  filter.genres = genre;
  if (status) filter.status = status;

  const sortMap = {
    latest:  { createdAt: -1 },
    oldest:  { createdAt:  1 },
    popular: { views: -1 },
    rating:  { rating: -1 },
    az:      { title:  1 },
    za:      { title: -1 },
  };

  const [mangas, total] = await Promise.all([
    Manga.find(filter).sort(sortMap[order]).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments(filter),
  ]);

  const payload = { data: mangas, pagination: paginateMeta(total, currentPage, perPage) };
  return success(res, payload);
});

// ============================================================================
//  GET /comic/type/:type  — Filter by type (manga/manhwa/manhua)
// ============================================================================
const byType = catchAsync(async (req, res) => {
  const type = z.enum(['manga', 'manhwa', 'manhua']).parse(req.params.type);
  const { page, limit } = pageSchema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const filter = { type };
  const [mangas, total] = await Promise.all([
    Manga.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments(filter),
  ]);

  const payload = {
    data: mangas,
    pagination: paginateMeta(total, currentPage, perPage),
    meta: { type },
  };
  return success(res, payload);
});

// ============================================================================
//  GET /comic/genre/:genre  — List by genre
// ============================================================================
const byGenre = catchAsync(async (req, res) => {
  const genre = z.string().min(1).max(100).parse(req.params.genre);
  const { page, limit } = pageSchema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const filter = { genres: { $in: [genre] } };
  const [mangas, total] = await Promise.all([
    Manga.find(filter).sort({ rating: -1 }).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments(filter),
  ]);

  const payload = {
    data: mangas,
    pagination: paginateMeta(total, currentPage, perPage),
    meta: { genre },
  };
  return success(res, payload);
});

// ============================================================================
//  GET /comic/genres  — Daftar semua genre/tag
// ============================================================================
const genres = catchAsync(async (req, res) => {
  const Manga = require('../../models/Manga');
  const result = await Manga.aggregate([
    { $unwind: '$genres' },
    { $group: { _id: '$genres', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $project: { _id: 0, name: '$_id', count: 1, slug: { $toLower: { $replaceAll: { input: '$_id', find: ' ', replacement: '-' } } } } },
  ]);
  return success(res, { data: result });
});

// ============================================================================
//  GET /comic/comic/:slug  — Detail komik + daftar chapter
// ============================================================================
const detail = catchAsync(async (req, res) => {
  const slug = z.string().min(1).max(200).parse(req.params.slug);
  const manga = await mangaService.getMangaBySlug(slug);

  const chapters = await chapterRepo.findList({
    mangaId: manga._id,
    skip: 0,
    limit: 100,
  });

  return success(res, { data: { ...manga.toObject(), chapters } });
});

// ============================================================================
//  GET /comic/chapter/:slug  — Gambar chapter untuk dibaca
// ============================================================================
const chapterRead = catchAsync(async (req, res) => {
  const slug = z.string().min(1).max(200).parse(req.params.slug);

  // chapter slug format: "manga-slug-chapter-N" or direct chapter id
  const chapter = await chapterRepo.findOne({ slug });
  if (!chapter) throw new ApiError(404, 'Chapter not found');

  return success(res, { data: chapter });
});

// ============================================================================
//  GET /comic/chapter/:slug/navigation  — prev/next chapter navigation
// ============================================================================
const chapterNavigation = catchAsync(async (req, res) => {
  const slug = z.string().min(1).max(200).parse(req.params.slug);

  const chapter = await chapterRepo.findOne({ slug });
  if (!chapter) throw new ApiError(404, 'Chapter not found');

  const [prev, next] = await Promise.all([
    chapterRepo.findOne({ manga: chapter.manga, chapterNumber: { $lt: chapter.chapterNumber } }),
    chapterRepo.findOne({ manga: chapter.manga, chapterNumber: { $gt: chapter.chapterNumber } }),
  ]);

  return success(res, {
    data: {
      current: chapter,
      prev: prev ? { slug: prev.slug, chapterNumber: prev.chapterNumber } : null,
      next: next ? { slug: next.slug, chapterNumber: next.chapterNumber } : null,
    },
  });
});

// ============================================================================
//  GET /comic/random  — Komik acak untuk discovery
// ============================================================================
const random = catchAsync(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(20).default(1).parse(req.query.limit);
  const total = await Manga.countDocuments({});
  if (total === 0) return success(res, { data: [] });

  const skip = Math.max(0, Math.floor(Math.random() * total) - limit);
  const mangas = await Manga.find({}).skip(skip).limit(limit).select(buildMangaSelect);
  return success(res, { data: mangas });
});

// ============================================================================
//  GET /comic/berwarna/:page  — Komik berwarna (manhwa) per halaman
// ============================================================================
const berwarna = catchAsync(async (req, res) => {
  const page  = z.coerce.number().int().min(1).max(500).parse(req.params.page || 1);
  const limit = z.coerce.number().int().min(1).max(100).default(24).parse(req.query.limit);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  // "Berwarna" = manhwa (Korean webtoon, usually colored)
  const filter = { type: 'manhwa' };
  const [mangas, total] = await Promise.all([
    Manga.find(filter).sort({ rating: -1 }).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments(filter),
  ]);

  const payload = { data: mangas, pagination: paginateMeta(total, currentPage, perPage) };
  return success(res, payload);
});

// ============================================================================
//  GET /comic/pustaka/:page  — Perpustakaan semua komik per halaman
// ============================================================================
const pustaka = catchAsync(async (req, res) => {
  const page  = z.coerce.number().int().min(1).max(5000).parse(req.params.page || 1);
  const limit = z.coerce.number().int().min(1).max(100).default(24).parse(req.query.limit);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [mangas, total] = await Promise.all([
    Manga.find({}).sort({ title: 1 }).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments({}),
  ]);

  const payload = { data: mangas, pagination: paginateMeta(total, currentPage, perPage) };
  return success(res, payload);
});

// ============================================================================
//  GET /comic/unlimited  — Akses semua data tanpa batas (deep crawl style)
// ============================================================================
const unlimited = catchAsync(async (req, res) => {
  const schema = z.object({
    page:   z.coerce.number().int().min(1).default(1),
    limit:  z.coerce.number().int().min(1).max(100).default(50),
    type:   z.enum(['manga', 'manhwa', 'manhua']).optional(),
    status: z.enum(['ongoing', 'completed', 'hiatus']).optional(),
  });
  const { page, limit: limitVal, type, status } = schema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limitVal);

  const filter = {};
  if (type)   filter.type   = type;
  if (status) filter.status = status;

  const [mangas, total] = await Promise.all([
    Manga.find(filter).sort({ createdAt: -1 }).skip(skip).limit(perPage).select(buildMangaSelect),
    Manga.countDocuments(filter),
  ]);

  const payload = {
    data: mangas,
    pagination: paginateMeta(total, currentPage, perPage),
    meta: { note: 'Unlimited access — deep crawl mode', totalInDB: total },
  };
  return success(res, payload);
});

// ============================================================================
//  GET /comic/scroll  — Infinite scroll simulation (offset pagination)
// ============================================================================
const scroll = catchAsync(async (req, res) => {
  const schema = z.object({
    offset: z.coerce.number().int().min(0).default(0),
    limit:  z.coerce.number().int().min(1).max(50).default(20),
    type:   z.enum(['manga', 'manhwa', 'manhua']).optional(),
  });
  const { offset, limit, type } = schema.parse(req.query);

  const filter = {};
  if (type) filter.type = type;

  const total = await Manga.countDocuments(filter);
  const mangas = await Manga.find(filter)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .select(buildMangaSelect);

  return success(res, {
    data: mangas,
    meta: {
      offset,
      limit,
      hasMore: offset + limit < total,
      nextOffset: offset + limit < total ? offset + limit : null,
      total,
    },
  });
});

// ============================================================================
//  GET /comic/infinite  — Infinite load dengan cursor pagination
// ============================================================================
const infinite = catchAsync(async (req, res) => {
  const schema = z.object({
    page:  z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  });
  const { page, limit } = schema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const total = await Manga.countDocuments({});
  const mangas = await Manga.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(perPage)
    .select(buildMangaSelect);

  return success(res, {
    data: mangas,
    meta: {
      page: currentPage,
      limit: perPage,
      hasNextPage: currentPage * perPage < total,
      total,
    },
  });
});

// ============================================================================
//  GET /comic/homepage  — Data lengkap homepage
// ============================================================================
const homepage = catchAsync(async (req, res) => {
  const cacheKey = 'comic:homepage';
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const [popular, latest, trending, newlyAdded] = await Promise.all([
    trendingService.getPopularByMetric('views', 10),
    trendingService.getLatestManga(10),
    trendingService.getTrendingByBookmarks('week', 10),
    Manga.find({}).sort({ createdAt: -1 }).limit(8).select(buildMangaSelect),
  ]);

  const payload = {
    data: {
      popular:    popular.data,
      latest:     latest.data,
      trending:   trending.data,
      newlyAdded,
    },
  };
  await cache.set(cacheKey, payload, 3 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/recommendations  — Rekomendasi berdasarkan popularitas
// ============================================================================
const recommendations = catchAsync(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(30).default(10).parse(req.query.limit);
  const cacheKey = `comic:recommendations:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  // Rekomendasi = highly rated + many views
  const mangas = await Manga.find({ rating: { $gt: 0 } })
    .sort({ rating: -1, views: -1 })
    .limit(limit)
    .select(buildMangaSelect);

  const payload = { data: mangas };
  await cache.set(cacheKey, payload, 10 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/stats  — Statistik umum API
// ============================================================================
const stats = catchAsync(async (req, res) => {
  const cacheKey = 'comic:stats';
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const [total, byType, byStatus] = await Promise.all([
    Manga.countDocuments({}),
    Manga.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Manga.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const payload = {
    data: {
      total,
      byType:   Object.fromEntries(byType.map(({ _id, count }) => [_id || 'unknown', count])),
      byStatus: Object.fromEntries(byStatus.map(({ _id, count }) => [_id || 'unknown', count])),
    },
  };
  await cache.set(cacheKey, payload, 5 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/fullstats  — Statistik lengkap semua endpoint
// ============================================================================
const fullstats = catchAsync(async (req, res) => {
  const cacheKey = 'comic:fullstats';
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const { Chapter, Tag, Bookmark, Review } = require('../../models');

  const [totalManga, totalChapters, totalTags, totalBookmarks, totalReviews, topRated, mostViewed] =
    await Promise.all([
      Manga.countDocuments({}),
      Chapter.countDocuments({}),
      Tag.countDocuments({}),
      Bookmark.countDocuments({}),
      Review.countDocuments({}),
      Manga.find({ rating: { $gt: 0 } }).sort({ rating: -1 }).limit(5).select('title slug rating'),
      Manga.find({}).sort({ views: -1 }).limit(5).select('title slug views'),
    ]);

  const payload = {
    data: {
      counts: { manga: totalManga, chapters: totalChapters, tags: totalTags, bookmarks: totalBookmarks, reviews: totalReviews },
      topRated,
      mostViewed,
    },
  };
  await cache.set(cacheKey, payload, 5 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/analytics  — Analytics & statistik detail
// ============================================================================
const analytics = catchAsync(async (req, res) => {
  const cacheKey = 'comic:analytics';
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const now = new Date();
  const weekAgo   = new Date(now); weekAgo.setDate(now.getDate() - 7);
  const monthAgo  = new Date(now); monthAgo.setMonth(now.getMonth() - 1);

  const [total, addedThisWeek, addedThisMonth, avgRating] = await Promise.all([
    Manga.countDocuments({}),
    Manga.countDocuments({ createdAt: { $gte: weekAgo } }),
    Manga.countDocuments({ createdAt: { $gte: monthAgo } }),
    Manga.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]),
  ]);

  const payload = {
    data: {
      total,
      addedThisWeek,
      addedThisMonth,
      avgRating: avgRating[0]?.avg?.toFixed(2) || 0,
      generatedAt: now.toISOString(),
    },
  };
  await cache.set(cacheKey, payload, 10 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/realtime  — Data real-time parallel fetching
// ============================================================================
const realtime = catchAsync(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(20).default(10).parse(req.query.limit);

  const [newlyAdded, recentlyRated, justUpdated] = await Promise.all([
    Manga.find({}).sort({ createdAt: -1 }).limit(limit).select(buildMangaSelect),
    Manga.find({ rating: { $gt: 0 } }).sort({ updatedAt: -1 }).limit(limit).select('title slug rating updatedAt'),
    Manga.find({}).sort({ updatedAt: -1 }).limit(limit).select('title slug updatedAt'),
  ]);

  return success(res, {
    data: { newlyAdded, recentlyRated, justUpdated },
    meta: { fetchedAt: new Date().toISOString(), parallel: true },
  });
});

// ============================================================================
//  GET /comic/comparison  — Performa API vs website scroll (demo)
// ============================================================================
const comparison = catchAsync(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);

  const apiStart = Date.now();
  const mangas = await Manga.find({}).sort({ createdAt: -1 }).limit(limit).select(buildMangaSelect);
  const apiMs = Date.now() - apiStart;

  return success(res, {
    data: {
      mangas,
      performance: {
        apiResponseMs:       apiMs,
        estimatedWebScrapMs: apiMs * 15, // rough estimate
        speedupFactor:       `~${Math.round(15)}x faster than web scraping`,
        itemsFetched:        mangas.length,
      },
    },
  });
});

// ============================================================================
//  GET /comic/health  — Health check & monitoring
// ============================================================================
const health = catchAsync(async (req, res) => {
  const dbStart = Date.now();
  let dbStatus = 'ok';
  let totalManga = 0;
  try {
    totalManga = await Manga.countDocuments({});
  } catch (_e) {
    dbStatus = 'error';
  }
  const dbMs = Date.now() - dbStart;

  return success(res, {
    data: {
      status:    dbStatus === 'ok' ? 'healthy' : 'degraded',
      database:  { status: dbStatus, responseMs: dbMs, totalManga },
      server:    { uptime: process.uptime().toFixed(1) + 's', nodeVersion: process.version },
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
//  POST /comic  — Buat komik baru (admin only)
// ============================================================================
const create = catchAsync(async (req, res) => {
  const data = mangaValidation.createManga.parse(req.body);
  if (req.file) data.coverImage = coverFileUrl(req.file);
  const manga = await mangaService.createManga(data, req.user.id);
  return success(res, { statusCode: 201, message: 'Comic created', data: manga });
});

// ============================================================================
//  PUT /comic/:id  — Update komik (admin only)
// ============================================================================
const update = catchAsync(async (req, res) => {
  const data = mangaValidation.updateManga.parse(req.body);
  if (req.file) data.coverImage = coverFileUrl(req.file);
  const manga = await mangaService.updateManga(req.params.id, data);
  return success(res, { message: 'Comic updated', data: manga });
});

// ============================================================================
//  DELETE /comic/:id  — Hapus komik beserta semua relasinya (admin only)
// ============================================================================
const remove = catchAsync(async (req, res) => {
  await mangaService.deleteManga(req.params.id);
  return success(res, { message: 'Comic deleted' });
});

// ============================================================================
//  PATCH /comic/:id/rate  — Beri rating 1–10 (user login, rate-limited)
// ============================================================================
const rate = catchAsync(async (req, res) => {
  const { score } = mangaValidation.rateManga.parse(req.body);
  const result = await mangaService.rateContent(req.params.id, req.user.id, score);
  return success(res, { message: 'Rating submitted', data: result });
});

module.exports = {
  terbaru, populer, trending, latest,
  search, advancedSearch, browse,
  byType, byGenre, genres,
  detail, chapterRead, chapterNavigation,
  random, berwarna, pustaka,
  unlimited, scroll, infinite,
  homepage, recommendations,
  stats, fullstats, analytics,
  realtime, comparison, health,
  // ── Admin CRUD ──────────────────────────────────────────────────────────────
  create, update, remove, rate,
};
