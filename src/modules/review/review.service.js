'use strict';

const reviewRepo = require('../../repositories/review.repository');
const ApiError   = require('../../shared/errors/ApiError');
const { paginate, paginateMeta } = require('../../shared/utils/paginate');
const cache = require('../../shared/utils/cache');

const invalidatePublicUserReviewCache = async (userId) => {
  await Promise.all([
    cache.del(`public:user:stats:${userId}`),
    cache.delPattern(`public:user:reviews:${userId}:*`),
  ]);
};

const createReview = async ({ userId, seriesId, body, score }) => {
  const existing = await reviewRepo.findByUserAndSeries(userId, seriesId);
  if (existing) throw new ApiError(409, 'You have already reviewed this series');
  const review = await reviewRepo.create({ user: userId, series: seriesId, body, score });
  await invalidatePublicUserReviewCache(userId);
  return review;
};

const getReviewsBySeries = async ({ seriesId, page, limit }) => {
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);
  const [reviews, total] = await Promise.all([
    reviewRepo.findBySeries({ seriesId, skip, limit: perPage }),
    reviewRepo.countBySeries(seriesId),
  ]);
  return { reviews, meta: paginateMeta(total, currentPage, perPage) };
};

const updateReview = async (reviewId, userId, data) => {
  const review = await reviewRepo.findById(reviewId);
  if (!review) throw new ApiError(404, 'Review not found');
  if (!review.user.equals(userId)) throw new ApiError(403, 'You can only edit your own review');
  const updatedReview = await reviewRepo.updateById(reviewId, data);
  await invalidatePublicUserReviewCache(userId);
  return updatedReview;
};

const deleteReview = async (reviewId, userId, userRole) => {
  const review = await reviewRepo.findById(reviewId);
  if (!review) throw new ApiError(404, 'Review not found');
  if (userRole !== 'admin' && !review.user.equals(userId)) {
    throw new ApiError(403, 'You can only delete your own review');
  }
  const deleted = await reviewRepo.deleteById(reviewId);
  await invalidatePublicUserReviewCache(String(review.user));
  return deleted;
};

module.exports = { createReview, getReviewsBySeries, updateReview, deleteReview };
