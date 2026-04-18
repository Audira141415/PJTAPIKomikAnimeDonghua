const {              Manga, Chapter, Episode              } = require('@models');
const { historyRepository: historyRepo } = require('@repositories');
const ApiError    = require('@core/errors/ApiError');
const { paginate, paginateMeta } = require('@core/utils/paginate');

const addHistory = async (userId, payload) => {
  const { mangaId, contentType } = payload;

  const manga = await Manga.findById(mangaId).lean();
  if (!manga) throw new ApiError(404, 'Series not found');

  if (contentType === 'comic') {
    const { chapterId } = payload;
    const chapter = await Chapter.findById(chapterId).lean();
    if (!chapter) throw new ApiError(404, 'Chapter not found');
    return historyRepo.upsert(userId, mangaId, { chapterId, contentType });
  }

  // animation
  const { episodeId, watchProgress } = payload;
  const episode = await Episode.findById(episodeId).lean();
  if (!episode) throw new ApiError(404, 'Episode not found');
  return historyRepo.upsert(userId, mangaId, { episodeId, contentType, watchProgress });
};

const getHistory = async (userId, query) => {
  const { page, limit, contentType } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const filter = { user: userId };
  if (contentType) filter.contentType = contentType;

  const [history, total] = await Promise.all([
    historyRepo.findByUser({ userId, skip, limit: perPage, contentType }),
    historyRepo.countByUser({ userId, contentType }),
  ]);

  return { history, meta: paginateMeta(total, currentPage, perPage) };
};

module.exports = { addHistory, getHistory };
