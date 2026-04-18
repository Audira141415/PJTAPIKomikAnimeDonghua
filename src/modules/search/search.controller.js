'use strict';

const { Manga } = require('../../models');
const cache = require('../../shared/utils/cache');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const ApiError = require('../../shared/errors/ApiError');
const { paginate, paginateMeta } = require('../../shared/utils/paginate');
const { searchQuery: searchQuerySchema } = require('./search.validation');

const search = catchAsync(async (req, res) => {
  const { q, type, category, genre, status, year_from, year_to, page, limit: limitVal } = searchQuerySchema.parse(req.query);

  const { skip, limit: perPage, page: currentPage } = paginate(page, limitVal);

  // Build cache key with all filters
  const cacheKeyParts = [
    `search:${q.toLowerCase().trim()}`,
    type || 'all-types',
    category || 'all-categories',
    genre || 'all-genres',
    status || 'all-status',
    year_from ? `from${year_from}` : 'from-any',
    year_to ? `to${year_to}` : 'to-any',
    `page${currentPage}`,
    `limit${perPage}`,
  ];
  const cacheKey = cacheKeyParts.join(':');
  const cached = await cache.get(cacheKey);
  if (cached) return success(res, cached);

  // Build MongoDB filter
  const filter = { $text: { $search: q } };
  
  // Resolve category and type filters
  if (category === 'comic' || category === 'manga') {
    filter.contentCategory = 'comic';
  } else if (category === 'animation' || category === 'anime' || category === 'donghua') {
    filter.contentCategory = 'animation';
  }

  if (type) {
    filter.type = type;
  }

  // Refine Anime/Donghua separation in search
  if (type === 'anime' || category === 'anime') {
    filter.type = { $nin: ['donghua'] };
    filter.slug = { $not: /donghua|anichin|anix|dong-hua|china|chinese/ };
  } else if (type === 'donghua' || category === 'donghua') {
    filter.type = 'donghua';
  }

  if (status) filter.status = status;
  if (genre) filter.genres = genre; 
  
  // Year range filter via releasedOn date
  if (year_from || year_to) {
    filter.releasedOn = {};
    if (year_from) filter.releasedOn.$gte = new Date(`${year_from}-01-01`);
    if (year_to) filter.releasedOn.$lte = new Date(`${year_to}-12-31`);
  }

  const [results, total] = await Promise.all([
    Manga.find(filter, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, rating: -1 })
      .skip(skip)
      .limit(perPage)
      .select('title slug type contentCategory coverImage status rating views genres releasedOn'),
    Manga.countDocuments(filter),
  ]);

  const payload = { data: results, meta: paginateMeta(total, currentPage, perPage) };
  await cache.set(cacheKey, payload, 2 * 60); // 2 min TTL for search results
  return success(res, payload);
});

module.exports = { search };
