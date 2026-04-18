'use strict';

const {              Manga, Episode              } = require('@models');
const { success } = require('@core/utils/response');
const ApiError = require('@core/errors/ApiError');

const getCategoriesConfig = (req, res) => {
  const DEFAULT_SLOTS = [
    { source: 'topAiring', label: 'Top Airing' },
    { source: 'mostPopular', label: 'Most Popular' },
    { source: 'mostFavorite', label: 'Most Favorite' },
    { source: 'latestCompleted', label: 'Latest Completed' },
  ];

  const config = {
    anime: DEFAULT_SLOTS,
    donghua: DEFAULT_SLOTS,
    updatedAt: Date.now(),
    updatedBy: 'system',
  };

  return success(res, { data: config });
};

/**
 * Legacy compatibility for AniList "Fast" details
 * Returns internal Manga data in a structure the frontend expects
 */
const getAnimeFast = async (req, res) => {
  const { id } = req.params;
  
  // Try to find by MongoDB ID first, then by slug
  let series = await Manga.findById(id).lean();
  if (!series) {
    series = await Manga.findOne({ slug: id }).lean();
  }

  if (!series) {
    throw new ApiError(404, 'Anime not found');
  }

  // Get episodes for "fast" view
  const episodes = await Episode.find({ manga: series._id }).sort({ order: 1 }).lean();

  return success(res, {
    anime: series,
    episodes: episodes,
    scraperSession: series.sourceId || null
  });
};

module.exports = { 
  getCategoriesConfig,
  getAnimeFast,
};
