'use strict';

const { commentRepository: commentRepo } = require('@repositories');
const ApiError    = require('@core/errors/ApiError');
const { paginate, paginateMeta } = require('@core/utils/paginate');
const cache = require('@core/utils/cache');

const invalidatePublicUserCommentCache = async (userId) => {
  await Promise.all([
    cache.del(`public:user:stats:${userId}`),
    cache.delPattern(`public:user:comments:${userId}:*`),
  ]);
};

const triggerPublicUserCommentInvalidation = (userId) => {
  invalidatePublicUserCommentCache(userId).catch(() => undefined);
};

const postComment = async ({ userId, seriesId, chapterId, episodeId, body, parentCommentId }) => {
  const comment = await commentRepo.create({
    user:          userId,
    series:        seriesId,
    chapter:       chapterId || null,
    episode:       episodeId || null,
    parentComment: parentCommentId || null,
    body,
  });
  await invalidatePublicUserCommentCache(userId);
  return comment;
};

const getCommentsBySeries = async ({ seriesId, page, limit }) => {
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const [comments, total] = await Promise.all([
    commentRepo.findBySeries({ seriesId, skip, limit: perPage }),
    commentRepo.countBySeries(seriesId),
  ]);
  return { comments, meta: paginateMeta(total, currentPage, perPage) };
};

const getReplies = (parentId, { page, limit } = {}) => {
  const { skip, limit: perPage } = paginate(page || 1, limit || 50);
  return commentRepo.findReplies({ parentId, skip, limit: perPage });
};

const deleteComment = async (commentId, userId, userRole) => {
  const comment = await commentRepo.findById(commentId);
  if (!comment) throw new ApiError(404, 'Comment not found');
  if (userRole !== 'admin' && !comment.user.equals(userId)) {
    throw new ApiError(403, 'You can only delete your own comments');
  }
  const deleted = await commentRepo.softDelete(commentId);
  await invalidatePublicUserCommentCache(String(comment.user));
  return deleted;
};

const toggleLike = async (commentId, userId) => {
  const result = await commentRepo.toggleLike(commentId, userId);
  if (!result) throw new ApiError(404, 'Comment not found');
  triggerPublicUserCommentInvalidation(String(result.user));
  return result;
};

module.exports = { postComment, getCommentsBySeries, getReplies, deleteComment, toggleLike };
