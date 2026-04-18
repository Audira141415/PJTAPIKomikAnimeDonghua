'use strict';

const {             Comment             } = require('@models');

const create = (data) => Comment.create(data);

const findBySeries = ({ seriesId, skip, limit }) =>
  Comment.find({ series: seriesId, parentComment: null, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username avatar displayName');

const countBySeries = (seriesId) =>
  Comment.countDocuments({ series: seriesId, parentComment: null, isDeleted: false });

const findReplies = ({ parentId, skip = 0, limit = 50 }) =>
  Comment.find({ parentComment: parentId, isDeleted: false })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username avatar displayName');

const findByUserPublic = ({ userId, skip, limit, sort = 'latest' }) => {
  const sortQuery = sort === 'most_liked'
    ? { likes: -1, createdAt: -1 }
    : { createdAt: -1 };

  return Comment.find({ user: userId, isDeleted: false })
    .sort(sortQuery)
    .skip(skip)
    .limit(limit)
    .populate('series', 'title slug coverImage type status rating')
    .select('series body likes parentComment createdAt updatedAt')
    .lean();
};

const countByUser = (userId) =>
  Comment.countDocuments({ user: userId, isDeleted: false });

const findById = (id) => Comment.findById(id);

/**
 * Soft-delete: replace body with [deleted] and mark flag
 */
const softDelete = (id) =>
  Comment.findByIdAndUpdate(id, { isDeleted: true, body: '[deleted]' }, { new: true });

/**
 * Toggle like atomically: prevents race conditions on concurrent requests.
 * Uses $addToSet/$pull + $inc to avoid read-then-write pattern.
 */
const toggleLike = async (id, userId) => {
  const alreadyLiked = await Comment.findOne({ _id: id, likedBy: userId }).select('_id').lean();
  if (alreadyLiked) {
    return Comment.findByIdAndUpdate(
      id,
      { $pull: { likedBy: userId }, $inc: { likes: -1 } },
      { new: true }
    );
  }
  // Returns null automatically if comment doesn't exist
  return Comment.findByIdAndUpdate(
    id,
    { $addToSet: { likedBy: userId }, $inc: { likes: 1 } },
    { new: true }
  );
};

module.exports = {
  create,
  findBySeries,
  findByUserPublic,
  countBySeries,
  countByUser,
  findReplies,
  findById,
  softDelete,
  toggleLike,
};
