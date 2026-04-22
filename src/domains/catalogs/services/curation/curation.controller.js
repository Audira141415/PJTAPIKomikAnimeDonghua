'use strict';

const { Manga } = require('@models');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const ApiError = require('@core/errors/ApiError');

/**
 * Get curated list (Featured & Hot items)
 */
const getCurated = catchAsync(async (req, res) => {
  const featured = await Manga.find({ isFeatured: true }).sort({ updatedAt: -1 }).limit(20);
  const hot = await Manga.find({ isHot: true }).sort({ updatedAt: -1 }).limit(20);

  return success(res, {
    message: 'Curated content fetched',
    data: { featured, hot },
  });
});

/**
 * Toggle Featured status
 */
const toggleFeatured = catchAsync(async (req, res) => {
  const { id } = req.params;
  const manga = await Manga.findById(id);
  if (!manga) throw new ApiError(404, 'Content not found');

  manga.isFeatured = !manga.isFeatured;
  await manga.save();

  return success(res, {
    message: `Content ${manga.isFeatured ? 'featured' : 'unfeatured'} successfully`,
    data: manga,
  });
});

/**
 * Toggle Hot status
 */
const toggleHot = catchAsync(async (req, res) => {
  const { id } = req.params;
  const manga = await Manga.findById(id);
  if (!manga) throw new ApiError(404, 'Content not found');

  manga.isHot = !manga.isHot;
  await manga.save();

  return success(res, {
    message: `Content ${manga.isHot ? 'marked as hot' : 'removed from hot'} successfully`,
    data: manga,
  });
});

/**
 * Update Curation Meta (Status Message)
 */
const updateCurationMeta = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { statusMessage } = req.body;
  
  const manga = await Manga.findByIdAndUpdate(
    id,
    { $set: { statusMessage } },
    { new: true }
  );

  if (!manga) throw new ApiError(404, 'Content not found');

  return success(res, {
    message: 'Curation metadata updated',
    data: manga,
  });
});

module.exports = {
  getCurated,
  toggleFeatured,
  toggleHot,
  updateCurationMeta,
};
