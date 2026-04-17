'use strict';

const { success } = require('../../shared/utils/response');

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

  return success(res, config);
};

module.exports = { getCategoriesConfig };
