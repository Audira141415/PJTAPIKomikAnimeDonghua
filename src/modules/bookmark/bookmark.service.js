const mangaRepo = require('../../repositories/manga.repository');
const bookmarkRepo = require('../../repositories/bookmark.repository');
const ApiError = require('../../shared/errors/ApiError');
const { paginate, paginateMeta } = require('../../shared/utils/paginate');
const { invalidateTrendingCaches } = require('../trending/trending.service');

const triggerTrendingInvalidation = () => {
  invalidateTrendingCaches().catch(() => undefined);
};

const toggleBookmark = async (userId, mangaId) => {
  const manga = await mangaRepo.findById(mangaId);
  if (!manga) throw new ApiError(404, 'Manga not found');

  const existing = await bookmarkRepo.findOne(userId, mangaId);
  if (existing) {
    await bookmarkRepo.deleteOne(existing._id);
    triggerTrendingInvalidation();
    return { bookmarked: false };
  }

  await bookmarkRepo.create(userId, mangaId);
  triggerTrendingInvalidation();
  return { bookmarked: true };
};

const getBookmarks = async (userId, query) => {
  const { page, limit } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [bookmarks, total] = await Promise.all([
    bookmarkRepo.findByUser({ userId, skip, limit: perPage }),
    bookmarkRepo.countByUser(userId),
  ]);

  return { bookmarks, meta: paginateMeta(total, currentPage, perPage) };
};

module.exports = { toggleBookmark, getBookmarks };
