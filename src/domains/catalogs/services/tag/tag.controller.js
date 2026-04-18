const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const tagService = require('./tag.service');
const { createTag: createSchema, updateTag: updateSchema, listTags: listSchema } = require('./tag.validation');

/**
 * GET /api/v1/tags
 * Optional query: prefix, page, limit
 */
const list = catchAsync(async (req, res) => {
  const opts = listSchema.parse(req.query);
  const data = await tagService.listTags(opts);
  success(res, data);
});

/**
 * GET /api/v1/tags/:slug
 */
const getBySlug = catchAsync(async (req, res) => {
  const tag = await tagService.getTag(req.params.slug);
  success(res, { data: tag });
});

/**
 * POST /api/v1/tags  [admin]
 */
const create = catchAsync(async (req, res) => {
  const data = createSchema.parse(req.body);
  const tag = await tagService.createTag(data);
  success(res, { statusCode: 201, data: tag });
});

/**
 * PATCH /api/v1/tags/:id  [admin]
 */
const update = catchAsync(async (req, res) => {
  const data = updateSchema.parse(req.body);
  const tag = await tagService.updateTag(req.params.id, data);
  success(res, { data: tag });
});

/**
 * DELETE /api/v1/tags/:id  [admin]
 */
const remove = catchAsync(async (req, res) => {
  await tagService.deleteTag(req.params.id);
  success(res, { data: null });
});

module.exports = { list, getBySlug, create, update, remove };
