'use strict';

const reviewService  = require('./review.service');
const catchAsync     = require('../../shared/utils/catchAsync');
const { success }    = require('../../shared/utils/response');
const { createSchema, updateSchema, querySchema } = require('./review.validation');

const create = catchAsync(async (req, res) => {
  const { series, body, score } = createSchema.parse(req.body);
  const review = await reviewService.createReview({ userId: req.user.id, seriesId: series, body, score });
  success(res, { statusCode: 201, message: 'Review submitted', data: review });
});

const getBySeries = catchAsync(async (req, res) => {
  const { page, limit } = querySchema.parse(req.query);
  const result = await reviewService.getReviewsBySeries({ seriesId: req.params.seriesId, page, limit });
  success(res, { data: result.reviews, meta: result.meta });
});

const update = catchAsync(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const review = await reviewService.updateReview(req.params.id, req.user.id, data);
  success(res, { message: 'Review updated', data: review });
});

const remove = catchAsync(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.user.id, req.user.role);
  success(res, { message: 'Review deleted' });
});

module.exports = { create, getBySeries, update, remove };
