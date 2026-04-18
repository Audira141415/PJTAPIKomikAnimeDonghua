const {              History              } = require('@models');

/**
 * Upsert a history entry.
 * For comic:     { userId, mangaId, chapterId, contentType: 'comic' }
 * For animation: { userId, mangaId, episodeId, contentType: 'animation', watchProgress? }
 */
const upsert = (userId, mangaId, { chapterId, episodeId, contentType, watchProgress = 0 }) => {
  const filter = { user: userId, manga: mangaId };
  const update = { readAt: new Date(), contentType };

  if (contentType === 'comic') {
    filter.chapter = chapterId;
    update.episode = null;
  } else {
    filter.episode = episodeId;
    update.chapter = null;
    update.watchProgress = watchProgress;
  }

  return History.findOneAndUpdate(filter, update, { upsert: true, new: true });
};

const findByUser = ({ userId, skip, limit, contentType }) => {
  const filter = { user: userId };
  if (contentType) filter.contentType = contentType;
  return History.find(filter)
    .populate('manga',   'title slug coverImage type contentCategory')
    .populate('chapter', 'chapterNumber title')
    .populate('episode', 'episodeNumber title thumbnail duration')
    .sort({ readAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

const countByUser = ({ userId, contentType }) => {
  const filter = { user: userId };
  if (contentType) filter.contentType = contentType;
  return History.countDocuments(filter);
};

module.exports = { upsert, findByUser, countByUser };
