const catchAsync = require('../../shared/utils/catchAsync');
const { sendSuccess, sendCreated } = require('../../shared/utils/response');
const tagService = require('./tag.service');
const { createTag: createSchema, updateTag: updateSchema, listTags: listSchema } = require('./tag.validation');

/**
 * GET /api/v1/tags
 * Optional query: prefix, page, limit
 */
const list = catchAsync(async (req, res) => {
  const opts = listSchema.parse(req.query);
  const data = await tagService.listTags(opts);
  sendSuccess(res, data);
});

/**
 * GET /api/v1/tags/:slug
 */
const getBySlug = catchAsync(async (req, res) => {
  const tag = await tagService.getTag(req.params.slug);
  sendSuccess(res, { tag });
});

/**
 * POST /api/v1/tags  [admin]
 */
const create = catchAsync(async (req, res) => {
  const data = createSchema.parse(req.body);
  const tag = await tagService.createTag(data);
  sendCreated(res, { tag });
});

/**
 * PATCH /api/v1/tags/:id  [admin]
 */
const update = catchAsync(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const tag = await tagService.updateTag(req.params.id, data);
  sendSuccess(res, { tag });
});

/**
 * DELETE /api/v1/tags/:id  [admin]
 */
const remove = catchAsync(async (req, res) => {
  await tagService.deleteTag(req.params.id);
  sendSuccess(res, null, 'Tag deleted');
});

module.exports = { list, getBySlug, create, update, remove };
