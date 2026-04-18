const { mangaRepository: mangaRepo } = require('@repositories');
const { ratingRepository: ratingRepo } = require('@repositories');
const ApiError   = require('@core/errors/ApiError');
const { SERIES_TYPE_CATEGORY } = require('@core/constants/status');
const { paginate, paginateMeta } = require('@core/utils/paginate');
const {             Bookmark, History, Chapter, Episode, Season, Review             } = require('@models');
const { invalidateTrendingCaches } = require('../trending/trending.service');

const triggerTrendingInvalidation = () => {
  invalidateTrendingCaches().catch(() => undefined);
};

const createManga = async (data, userId) => {
  const contentCategory = SERIES_TYPE_CATEGORY[data.type];
  const manga = await mangaRepo.create({ ...data, contentCategory, createdBy: userId });
  triggerTrendingInvalidation();
  return manga;
};

const getMangaList = async (query) => {
  const { page, limit, search, genre, type, contentCategory, status, sortBy, order } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const filter = {};
  if (search)          filter.$text            = { $search: search };
  if (genre)           filter.genres           = { $in: [genre] };
  if (type)            filter.type             = type;
  if (contentCategory) filter.contentCategory  = contentCategory;
  if (status)          filter.status           = status;

  const sort = { [sortBy || 'createdAt']: order === 'asc' ? 1 : -1 };

  const [mangas, total] = await Promise.all([
    mangaRepo.findList({ filter, sort, skip, limit: perPage }),
    mangaRepo.count(filter),
  ]);

  return { mangas, meta: paginateMeta(total, currentPage, perPage) };
};

const getMangaBySlug = async (slug) => {
  const manga = await mangaRepo.findBySlug(slug);
  if (!manga) throw new ApiError(404, 'Series not found');
  return manga;
};

const updateManga = async (id, data) => {
  // If type is being changed, update contentCategory accordingly
  if (data.type) {
    data.contentCategory = SERIES_TYPE_CATEGORY[data.type];
  }
  const manga = await mangaRepo.updateById(id, data);
  if (!manga) throw new ApiError(404, 'Series not found');
  triggerTrendingInvalidation();
  return manga;
};

const deleteManga = async (id) => {
  const manga = await mangaRepo.deleteById(id);
  if (!manga) throw new ApiError(404, 'Series not found');

  // M-10: Cascade delete all related data to prevent dangling references
  await Promise.all([
    Bookmark.deleteMany({ manga: id }),
    History.deleteMany({ manga: id }),
    Chapter.deleteMany({ manga: id }),
    Episode.deleteMany({ series: id }),
    Season.deleteMany({ series: id }),
    Review.deleteMany({ series: id }),
  ]);

  triggerTrendingInvalidation();

  return manga;
};

const rateContent = async (seriesId, userId, score) => {
  const manga = await mangaRepo.findById(seriesId);
  if (!manga) throw new ApiError(404, 'Series not found');
  const rating = await ratingRepo.upsertRating(userId, manga._id, score);
  triggerTrendingInvalidation();
  return rating;
};

const getRecommendations = async (seriesId) => {
  const manga = await mangaRepo.findById(seriesId);
  if (!manga) throw new ApiError(404, 'Series not found');

  // Same type first, else same contentCategory — overlap on genres, sorted by rating
  const results = await mangaRepo.findList({
    filter: {
      _id:    { $ne: manga._id },
      type:   manga.type,
      genres: { $in: manga.genres },
    },
    sort:  { rating: -1 },
    skip:  0,
    limit: 10,
  });

  // If fewer than 5, broaden to same contentCategory
  if (results.length < 5) {
    const broader = await mangaRepo.findList({
      filter: {
        _id:             { $ne: manga._id },
        contentCategory: manga.contentCategory,
        genres:          { $in: manga.genres },
      },
      sort:  { rating: -1 },
      skip:  0,
      limit: 10,
    });
    const ids = new Set(results.map((r) => r._id.toString()));
    for (const r of broader) {
      if (!ids.has(r._id.toString())) results.push(r);
      if (results.length >= 10) break;
    }
  }

  return results.slice(0, 10);
};

module.exports = { createManga, getMangaList, getMangaBySlug, updateManga, deleteManga, rateContent, getRecommendations };
