'use strict';

const {              Manga              } = require('@models');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const ApiError = require('@core/errors/ApiError');
const cache = require('@core/utils/cache');
const { paginate, paginateMeta } = require('@core/utils/paginate');
const mangaService = require('../services/manga/manga.service');
const mangaValidation = require('../services/manga/manga.validation');
const trendingService = require('../services/trending/trending.service');
const tagService = require('../services/tag/tag.service');
const { chapterRepository: chapterRepo } = require('@repositories');
const { coverFileUrl } = require('@middlewares/upload.middleware');
const { z } = require('zod');

// ── Shared query schemas ──────────────────────────────────────────────────────
const pageSchema = z.object({
  page:  z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const searchSchema = z.object({
  q:      z.string().min(1).max(200),
  type:   z.enum(['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona']).optional(),
  genre:  z.string().optional(),
  status: z.enum(['ongoing', 'completed', 'hiatus']).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

// ── Helper ────────────────────────────────────────────────────────────────────
const buildMangaSelect = 'title slug type contentCategory coverImage status rating views genres releasedOn';

const buildSourceLabelExpr = () => ({
  $let: {
    vars: {
      networkLabel: {
        $cond: [
          {
            $and: [
              { $ne: ['$network', null] },
              { $ne: ['$network', ''] },
            ],
          },
          '$network',
          null,
        ],
      },
      sourceKeyLabel: {
        $cond: [
          {
            $and: [
              { $ne: ['$sourceKey', null] },
              { $ne: ['$sourceKey', ''] },
            ],
          },
          '$sourceKey',
          null,
        ],
      },
      sourceUrlHost: {
        $let: {
          vars: {
            urlMatch: {
              $regexFind: {
                input: { $ifNull: ['$sourceUrl', ''] },
                regex: /^https?:\/\/([^/?#]+)/i,
              },
            },
          },
          in: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$$urlMatch.captures', []] } }, 0] },
              { $arrayElemAt: ['$$urlMatch.captures', 0] },
              null,
            ],
          },
        },
      },
    },
    in: { $ifNull: ['$$networkLabel', { $ifNull: ['$$sourceKeyLabel', '$$sourceUrlHost'] }] },
  },
});

// ============================================================================
//  GET /comic/terbaru  — Komik terbaru dengan pagination
// ============================================================================
const terbaru = catchAsync(async (req, res) => {
  const { page, limit } = pageSchema.parse(req.query);
  const cacheKey = `comic:terbaru:${page}:${limit}`;
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const filter = Manga.getDiscoveryFilter({ category: 'comic' });
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
  const payload = await trendingService.getPopularByMetric('views', limit, 'comic');
  return success(res, payload);
});

// ============================================================================
//  GET /comic/trending  — Trending berdasarkan bookmark activity
// ============================================================================
const trending = catchAsync(async (req, res) => {
  const period = z.enum(['week', 'month', 'all']).default('week').parse(req.query.period);
  const limit  = z.coerce.number().int().min(1).max(50).default(10).parse(req.query.limit);
  const payload = await trendingService.getTrendingByBookmarks(period, limit, 'comic');
  return success(res, payload);
});

// ============================================================================
//  GET /comic/latest  — Latest (alias getLatest service)
// ============================================================================
const latest = catchAsync(async (req, res) => {
  const limit = z.coerce.number().int().min(1).max(50).default(20).parse(req.query.limit);
  const payload = await trendingService.getLatestManga(limit, 'comic');
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
    const filter = { $text: { $search: q }, contentCategory: 'comic' };
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
    const filter = { title: { $regex: q, $options: 'i' }, contentCategory: 'comic' };
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
    const filter = { genres: genre, contentCategory: 'comic' };
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
    type:     z.enum(['manga', 'manhwa', 'manhua', 'anime', 'donghua', 'movie', 'ona']).optional(),
    genre:    z.string().optional(),
    status:   z.enum(['ongoing', 'completed', 'hiatus']).optional(),
    sortBy:   z.enum(['rating', 'views', 'createdAt', 'title']).default('createdAt'),
    order:    z.enum(['asc', 'desc']).default('desc'),
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(100).default(20),
  });
  const params = schema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(params.page, params.limit);

  const filter = { contentCategory: 'comic' };
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

  const filter = { contentCategory: 'comic' };
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
  const {             Manga             } = require('@models');
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
  const filter = Manga.getDiscoveryFilter({ category: 'comic' });
  const mangas = await Manga.find(filter).skip(skip).limit(limit).select(buildMangaSelect);
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
  const filter = { ...Manga.getDiscoveryFilter(), type: 'manhwa' };
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
    trendingService.getPopularByMetric('views', 10, 'comic'),
    trendingService.getLatestManga(10, 'comic'),
    trendingService.getTrendingByBookmarks('week', 10, 'comic'),
    Manga.find(Manga.getDiscoveryFilter({ category: 'comic' })).sort({ createdAt: -1 }).limit(8).select(buildMangaSelect),
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

  // Rekomendasi = highly rated + many views (comics only)
  const filter = Manga.getDiscoveryFilter({ category: 'comic' });
  filter.rating = { $gt: 0 };
  
  const mangas = await Manga.find(filter)
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
  const cacheKey = 'comic:stats:v4';
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const sourceLabelExpr = buildSourceLabelExpr();

  const [
    total,
    byType,
    byStatus,
    animationByNetwork,
    animationTotalAgg,
    sourceTotals,
    sourceTypeRows,
  ] = await Promise.all([
    Manga.countDocuments({}),
    Manga.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
    Manga.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Manga.aggregate([
      { $match: { contentCategory: 'animation' } },
      { $addFields: { sourceLabel: sourceLabelExpr } },
      { $match: { sourceLabel: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$sourceLabel', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { count: -1, _id: 1 } },
    ]),
    Manga.aggregate([
      { $match: { contentCategory: 'animation' } },
      { $count: 'total' },
    ]),
    Manga.aggregate([
      { $addFields: { sourceLabel: sourceLabelExpr } },
      { $match: { sourceLabel: { $exists: true, $nin: [null, ''] } } },
      {
        $group: {
          _id: '$sourceLabel',
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1, _id: 1 } },
    ]),
    Manga.aggregate([
      { $addFields: { sourceLabel: sourceLabelExpr } },
      { $match: { sourceLabel: { $exists: true, $nin: [null, ''] } } },
      {
        $group: {
          _id: { network: '$sourceLabel', type: '$type', contentCategory: '$contentCategory' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.network': 1, count: -1 } },
    ]),
  ]);

  const animationTotal = animationTotalAgg[0]?.total || 0;
  const animationByNetworkMap = Object.fromEntries(animationByNetwork.map(({ _id, count }) => [_id || 'unknown', count]));
  const animationSourceList = animationByNetwork.map((row) => ({
    source: row._id || 'unknown',
    count: row.count || 0,
    avgRating: Number((row.avgRating || 0).toFixed(2)),
  }));

  const sourceTypeMap = new Map();
  sourceTypeRows.forEach((row) => {
    const network = row._id?.network || 'unknown';
    const type = row._id?.type || 'unknown';
    const category = row._id?.contentCategory || 'unknown';
    if (!sourceTypeMap.has(network)) {
      sourceTypeMap.set(network, {
        source: network,
        total: 0,
        byType: {},
        byTypeCategory: {},
        contentCategories: {},
      });
    }

    const item = sourceTypeMap.get(network);
    item.total += row.count || 0;
    item.byType[type] = (item.byType[type] || 0) + (row.count || 0);
    item.byTypeCategory[`${type}:${category}`] = (item.byTypeCategory[`${type}:${category}`] || 0) + (row.count || 0);
    item.contentCategories[category] = (item.contentCategories[category] || 0) + (row.count || 0);
  });

  const sourceCards = sourceTotals.map((row) => {
    const network = row._id || 'unknown';
    const detail = sourceTypeMap.get(network) || {
      source: network,
      total: row.total || 0,
      byType: {},
      byTypeCategory: {},
      contentCategories: {},
    };
    const typeCategory = detail.byTypeCategory || {};
    return {
      source: network,
      total: row.total || 0,
      byType: detail.byType,
      byTypeCategory: typeCategory,
      contentCategories: detail.contentCategories,
      animeTotal: typeCategory['anime:animation'] || 0,
      donghuaTotal: (typeCategory['donghua:animation'] || 0) + (typeCategory['movie:animation'] || 0) + (typeCategory['ona:animation'] || 0),
      mangaTotal: (typeCategory['manga:comic'] || 0) + (typeCategory['manhwa:comic'] || 0) + (typeCategory['manhua:comic'] || 0),
    };
  });

  const animeSources = sourceCards
    .filter((row) => row.animeTotal > 0)
    .sort((a, b) => b.animeTotal - a.animeTotal)
    .map((row) => ({ ...row, categoryTotal: row.animeTotal }));
  const donghuaSources = sourceCards
    .filter((row) => row.donghuaTotal > 0)
    .sort((a, b) => b.donghuaTotal - a.donghuaTotal)
    .map((row) => ({ ...row, categoryTotal: row.donghuaTotal }));
  const mangaSources = sourceCards
    .filter((row) => row.mangaTotal > 0)
    .sort((a, b) => b.mangaTotal - a.mangaTotal)
    .map((row) => ({ ...row, categoryTotal: row.mangaTotal }));

  const topSources = sourceCards.slice().sort((a, b) => b.total - a.total).slice(0, 10).map((row) => ({
    ...row,
    primaryType: row.byType.anime ? 'anime' : row.byType.donghua ? 'donghua' : row.byType.manhwa ? 'manhwa' : row.byType.manga ? 'manga' : row.byType.manhua ? 'manhua' : row.byType.movie ? 'movie' : row.byType.ona ? 'ona' : 'unknown',
  }));

  const payload = {
    data: {
      total,
      byType: Object.fromEntries(byType.map(({ _id, count }) => [_id || 'unknown', count])),
      byStatus: Object.fromEntries(byStatus.map(({ _id, count }) => [_id || 'unknown', count])),
      animationTotal,
      animationSources: animationByNetwork.length,
      animationByNetwork: animationByNetworkMap,
      animationSourceList,
      proxySources: animationByNetwork.length,
      byNetwork: animationByNetworkMap,
      sourceBreakdown: {
        animeSources,
        donghuaSources,
        mangaSources,
        topSources,
      },
    },
  };
  await cache.set(cacheKey, payload, 5 * 60);
  return success(res, payload);
});

// ============================================================================
//  GET /comic/stats/source-items  — Daftar judul per source + rating
// ============================================================================
const statsSourceItems = catchAsync(async (req, res) => {
  const schema = z.object({
    source: z.string().trim().min(1).max(100).optional(),
    category: z.enum(['animation', 'comic']).default('animation'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  });
  const { source, category, page, limit } = schema.parse(req.query);
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const sourceLabelExpr = buildSourceLabelExpr();

  const sourceSummaryRows = await Manga.aggregate([
    { $match: { contentCategory: category } },
    { $addFields: { sourceLabel: sourceLabelExpr } },
    { $match: { sourceLabel: { $exists: true, $nin: [null, ''] } } },
    {
      $group: {
        _id: '$sourceLabel',
        total: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
    { $sort: { total: -1, _id: 1 } },
  ]);

  const selectedSource = source || sourceSummaryRows[0]?._id || null;
  if (!selectedSource) {
    return success(res, {
      data: [],
      pagination: paginateMeta(0, currentPage, perPage),
      meta: {
        category,
        selectedSource: null,
        sourceSummary: [],
      },
    });
  }

  const [items, totalRows] = await Promise.all([
    Manga.aggregate([
      { $match: { contentCategory: category } },
      { $addFields: { sourceLabel: sourceLabelExpr } },
      { $match: { sourceLabel: selectedSource } },
      { $sort: { rating: -1, views: -1, updatedAt: -1 } },
      { $skip: skip },
      { $limit: perPage },
      {
        $project: {
          title: 1,
          slug: 1,
          type: 1,
          rating: 1,
          views: 1,
          status: 1,
          network: 1,
          sourceKey: 1,
          updatedAt: 1,
          source: '$sourceLabel',
        },
      },
    ]),
    Manga.aggregate([
      { $match: { contentCategory: category } },
      { $addFields: { sourceLabel: sourceLabelExpr } },
      { $match: { sourceLabel: selectedSource } },
      { $count: 'total' },
    ]),
  ]);
  const total = totalRows[0]?.total || 0;

  const sourceSummary = sourceSummaryRows.map((row) => ({
    source: row._id,
    total: row.total || 0,
    avgRating: Number((row.avgRating || 0).toFixed(2)),
  }));

  const normalizedItems = items.map((item) => {
    const raw = typeof item.toObject === 'function' ? item.toObject() : item;
    return {
      ...raw,
      source: raw.source || raw.network || raw.sourceKey || null,
    };
  });

  return success(res, {
    data: normalizedItems,
    pagination: paginateMeta(total, currentPage, perPage),
    meta: {
      category,
      selectedSource,
      sourceSummary,
    },
  });
});

// ============================================================================
//  GET /comic/stats/distribution  — Debug distribusi animation by network+type
// ============================================================================
const statsDistribution = catchAsync(async (req, res) => {
  const includeSamples = ['1', 'true', 'yes'].includes(String(req.query.sample || '0').toLowerCase());
  const parsedSamplePerGroup = parseInt(req.query.samplePerGroup || '3', 10);
  const samplePerGroup = Number.isFinite(parsedSamplePerGroup)
    ? Math.min(10, Math.max(1, parsedSamplePerGroup))
    : 3;
  const networkFilter = typeof req.query.network === 'string' && req.query.network.trim() ? req.query.network.trim() : null;
  const typeFilter = typeof req.query.type === 'string' && req.query.type.trim() ? req.query.type.trim() : null;

  const sourceLabelExpr = buildSourceLabelExpr();

  const baseMatch = {
    contentCategory: 'animation',
    $or: [
      { network: { $exists: true, $nin: [null, ''] } },
      { sourceKey: { $exists: true, $nin: [null, ''] } },
      { sourceUrl: { $exists: true, $nin: [null, ''] } },
    ],
  };
  const match = { ...baseMatch };
  if (networkFilter) {
    const sourceUrlPattern = new RegExp(networkFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ network: networkFilter }, { sourceKey: networkFilter }, { sourceUrl: sourceUrlPattern }];
  }
  if (typeFilter) match.type = typeFilter;

  const typeTotalsMatch = { ...match };

  const [groupedRows, typeTotals, reasonRows, networkReasonRows, networkOptionsRows, typeOptionsRows] = await Promise.all([
    Manga.aggregate([
      { $match: match },
      {
        $group: {
          _id: { network: sourceLabelExpr, type: '$type' },
          count: { $sum: 1 },
          confidenceSum: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ['$inferenceConfidence', -1] }, -1] }, '$inferenceConfidence', 0],
            },
          },
          confidenceCount: {
            $sum: {
              $cond: [{ $gt: [{ $ifNull: ['$inferenceConfidence', -1] }, -1] }, 1, 0],
            },
          },
        },
      },
      { $sort: { '_id.network': 1, count: -1 } },
    ]),
    Manga.aggregate([
      { $match: typeTotalsMatch },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Manga.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            network: sourceLabelExpr,
            type: '$type',
            reason: { $ifNull: ['$inferenceReason', 'unknown'] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.network': 1, '_id.type': 1, count: -1 } },
      {
        $group: {
          _id: { network: '$_id.network', type: '$_id.type' },
          topRule: { $first: '$_id.reason' },
          topRuleCount: { $first: '$count' },
        },
      },
    ]),
    Manga.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            network: sourceLabelExpr,
            reason: { $ifNull: ['$inferenceReason', 'unknown'] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.network': 1, count: -1 } },
      {
        $group: {
          _id: '$_id.network',
          topRule: { $first: '$_id.reason' },
          topRuleCount: { $first: '$count' },
        },
      },
    ]),
    Manga.aggregate([
      { $match: baseMatch },
      { $group: { _id: sourceLabelExpr } },
      { $sort: { _id: 1 } },
    ]),
    Manga.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$type' } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const reasonMap = new Map(
    reasonRows.map((row) => [`${row._id?.network || 'unknown'}::${row._id?.type || 'unknown'}`, {
      topRule: row.topRule || 'unknown',
      topRuleCount: row.topRuleCount || 0,
    }])
  );

  const networkReasonMap = new Map(
    networkReasonRows.map((row) => [row._id || 'unknown', {
      topRule: row.topRule || 'unknown',
      topRuleCount: row.topRuleCount || 0,
    }])
  );

  const networkMap = new Map();

  groupedRows.forEach(({ _id, count, confidenceSum, confidenceCount }) => {
    const network = _id?.network || 'unknown';
    const type = _id?.type || 'unknown';
    const reasonInfo = reasonMap.get(`${network}::${type}`) || { topRule: 'unknown', topRuleCount: 0 };
    const avgConfidence = confidenceCount > 0 ? (confidenceSum / confidenceCount) : null;

    if (!networkMap.has(network)) {
      networkMap.set(network, {
        network,
        total: 0,
        byType: {},
        byTypeDetails: {},
        confidenceWeightedSum: 0,
        confidenceWeightCount: 0,
      });
    }

    const row = networkMap.get(network);
    row.total += count;
    row.byType[type] = count;
    row.byTypeDetails[type] = {
      count,
      avgConfidence: avgConfidence == null ? null : Number(avgConfidence.toFixed(3)),
      topRule: reasonInfo.topRule,
      topRuleCount: reasonInfo.topRuleCount,
    };
    if (avgConfidence != null) {
      row.confidenceWeightedSum += avgConfidence * confidenceCount;
      row.confidenceWeightCount += confidenceCount;
    }
  });

  let sampleMap = new Map();
  if (includeSamples) {
    const sampleRows = await Manga.aggregate([
      { $match: match },
      { $sort: { updatedAt: -1 } },
      {
        $group: {
          _id: { network: '$network', type: '$type' },
          samples: {
            $push: {
              title: '$title',
              slug: '$slug',
              updatedAt: '$updatedAt',
            },
          },
        },
      },
      { $project: { _id: 1, samples: { $slice: ['$samples', samplePerGroup] } } },
    ]);

    sampleMap = new Map(
      sampleRows.map((row) => [`${row._id?.network || 'unknown'}::${row._id?.type || 'unknown'}`, row.samples || []])
    );
  }

  const byNetwork = Array.from(networkMap.values())
    .sort((a, b) => b.total - a.total)
    .map((row) => {
      const networkRuleInfo = networkReasonMap.get(row.network) || { topRule: 'unknown' };
      const avgConfidence = row.confidenceWeightCount > 0
        ? Number((row.confidenceWeightedSum / row.confidenceWeightCount).toFixed(3))
        : null;

      const baseRow = {
        network: row.network,
        total: row.total,
        byType: row.byType,
        byTypeDetails: row.byTypeDetails,
        avgConfidence,
        topRule: networkRuleInfo.topRule || 'unknown',
      };

      if (!includeSamples) return baseRow;

      const withSamples = { ...baseRow, samples: {} };
      Object.keys(baseRow.byType).forEach((type) => {
        withSamples.samples[type] = sampleMap.get(`${row.network}::${type}`) || [];
      });
      return withSamples;
    });

  return success(res, {
    data: {
      totalNetworks: byNetwork.length,
      byType: Object.fromEntries(typeTotals.map(({ _id, count }) => [_id || 'unknown', count])),
      byNetwork,
      options: {
        includeSamples,
        samplePerGroup: includeSamples ? samplePerGroup : 0,
        selectedNetwork: networkFilter,
        selectedType: typeFilter,
        availableNetworks: networkOptionsRows.map((row) => row._id).filter(Boolean),
        availableTypes: typeOptionsRows.map((row) => row._id).filter(Boolean),
      },
      generatedAt: new Date().toISOString(),
    },
  });
});

// ============================================================================
//  GET /comic/fullstats  — Statistik lengkap semua endpoint
// ============================================================================
const fullstats = catchAsync(async (req, res) => {
  const cacheKey = 'comic:fullstats';
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  const {              Chapter, Tag, Bookmark, Review              } = require('@models');

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
  stats, statsSourceItems, statsDistribution, fullstats, analytics,
  realtime, comparison, health,
  // ── Admin CRUD ──────────────────────────────────────────────────────────────
  create, update, remove, rate,
};
