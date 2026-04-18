const { seasonRepository: seasonRepo } = require('@repositories');
const { mangaRepository: mangaRepo } = require('@repositories');
const ApiError   = require('@core/errors/ApiError');
const { paginate, paginateMeta } = require('@core/utils/paginate');

const ANIMATION_TYPES = ['anime', 'donghua'];

/** Verify the series exists and is an animation type */
const assertAnimationSeries = async (seriesId) => {
  const series = await mangaRepo.findById(seriesId);
  if (!series) throw new ApiError(404, 'Series not found');
  if (!ANIMATION_TYPES.includes(series.type)) {
    throw new ApiError(400, `Seasons only apply to animation series (anime/donghua). This series is type: ${series.type}`);
  }
  return series;
};

const createSeason = async (data) => {
  const { seriesId, ...rest } = data;
  await assertAnimationSeries(seriesId);

  // Guard duplicate season number
  const existing = await seasonRepo.findOne({ series: seriesId, number: rest.number });
  if (existing) throw new ApiError(409, `Season ${rest.number} already exists for this series`);

  return seasonRepo.create({ series: seriesId, ...rest });
};

const getSeasonsBySeries = async (seriesId, query) => {
  await assertAnimationSeries(seriesId);
  const { page, limit } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [seasons, total] = await Promise.all([
    seasonRepo.findBySeries({ seriesId, skip, limit: perPage }),
    seasonRepo.countBySeries(seriesId),
  ]);

  return { seasons, meta: paginateMeta(total, currentPage, perPage) };
};

const getSeasonById = async (id) => {
  const season = await seasonRepo.findById(id);
  if (!season) throw new ApiError(404, 'Season not found');
  return season;
};

const updateSeason = async (id, data) => {
  const season = await seasonRepo.updateById(id, data);
  if (!season) throw new ApiError(404, 'Season not found');
  return season;
};

const deleteSeason = async (id) => {
  const season = await seasonRepo.deleteById(id);
  if (!season) throw new ApiError(404, 'Season not found');
  return season;
};

module.exports = { createSeason, getSeasonsBySeries, getSeasonById, updateSeason, deleteSeason };
