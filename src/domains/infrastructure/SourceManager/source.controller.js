'use strict';

const { SourceFeed } = require('@models');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const ApiError = require('@core/errors/ApiError');
const { sourceBody, sourceIdParam, sourceQuery } = require('./source.validation');

const getSources = catchAsync(async (req, res) => {
  const query = sourceQuery.parse(req.query);
  const filter = {};
  
  if (query.category) filter.category = query.category;
  if (query.enabled !== undefined) filter.enabled = query.enabled;

  const sources = await SourceFeed.find(filter)
    .sort({ priority: 1, name: 1 })
    .limit(query.limit);

  return success(res, {
    message: 'Sources fetched successfully',
    data: sources,
  });
});

const getSourceById = catchAsync(async (req, res) => {
  const { id } = sourceIdParam.parse(req.params);
  const source = await SourceFeed.findById(id);
  
  if (!source) throw new ApiError(404, 'Source not found');

  return success(res, {
    message: 'Source fetched successfully',
    data: source,
  });
});

const createSource = catchAsync(async (req, res) => {
  const payload = sourceBody.parse(req.body);
  
  const existing = await SourceFeed.findOne({ key: payload.key });
  if (existing) throw new ApiError(409, 'Source key already exists');

  const source = await SourceFeed.create(payload);

  return success(res, {
    message: 'Source created successfully',
    data: source,
  }, 201);
});

const updateSource = catchAsync(async (req, res) => {
  const { id } = sourceIdParam.parse(req.params);
  const payload = sourceBody.partial().parse(req.body);

  const source = await SourceFeed.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  );

  if (!source) throw new ApiError(404, 'Source not found');

  return success(res, {
    message: 'Source updated successfully',
    data: source,
  });
});

const deleteSource = catchAsync(async (req, res) => {
  const { id } = sourceIdParam.parse(req.params);
  const source = await SourceFeed.findByIdAndDelete(id);

  if (!source) throw new ApiError(404, 'Source not found');

  return success(res, {
    message: 'Source deleted successfully',
    data: { id },
  });
});

const toggleSource = catchAsync(async (req, res) => {
  const { id } = sourceIdParam.parse(req.params);
  const source = await SourceFeed.findById(id);

  if (!source) throw new ApiError(404, 'Source not found');

  source.enabled = !source.enabled;
  await source.save();

  return success(res, {
    message: `Source ${source.enabled ? 'enabled' : 'disabled'} successfully`,
    data: source,
  });
});

module.exports = {
  getSources,
  getSourceById,
  createSource,
  updateSource,
  deleteSource,
  toggleSource,
};
