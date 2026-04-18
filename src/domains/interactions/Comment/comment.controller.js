'use strict';

const commentService = require('./comment.service');
const catchAsync     = require('@core/utils/catchAsync');
const { success }    = require('@core/utils/response');
const { createSchema, querySchema } = require('./comment.validation');

const post = catchAsync(async (req, res) => {
  const { series, chapter, episode, parentComment, body } = createSchema.parse(req.body);
  const comment = await commentService.postComment({
    userId: req.user.id, seriesId: series, chapterId: chapter,
    episodeId: episode, body, parentCommentId: parentComment,
  });
  success(res, { statusCode: 201, message: 'Comment posted', data: comment });
});

const getBySeries = catchAsync(async (req, res) => {
  const { page, limit } = querySchema.parse(req.query);
  const result = await commentService.getCommentsBySeries({
    seriesId: req.params.seriesId, page, limit,
  });
  success(res, { data: result.comments, meta: result.meta });
});

const getReplies = catchAsync(async (req, res) => {
  const { page, limit } = querySchema.parse(req.query);
  const replies = await commentService.getReplies(req.params.id, { page, limit });
  success(res, { data: replies });
});

const remove = catchAsync(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.user.id, req.user.role);
  success(res, { message: 'Comment deleted' });
});

const like = catchAsync(async (req, res) => {
  const comment = await commentService.toggleLike(req.params.id, req.user.id);
  success(res, { message: 'Like toggled', data: { likes: comment.likes } });
});

module.exports = { post, getBySeries, getReplies, remove, like };
