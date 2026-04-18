const { episodeRepository: episodeRepo } = require('@repositories');
const { seasonRepository: seasonRepo } = require('@repositories');
const { mangaRepository: mangaRepo } = require('@repositories');
const ApiError    = require('@core/errors/ApiError');
const { paginate, paginateMeta } = require('@core/utils/paginate');

const ANIMATION_TYPES = ['anime', 'donghua', 'movie', 'ona'];

const assertAnimationSeries = async (seriesId) => {
  const series = await mangaRepo.findById(seriesId);
  if (!series) throw new ApiError(404, 'Series not found');
  if (!ANIMATION_TYPES.includes(series.type)) {
    throw new ApiError(400, `Episodes only apply to animation series (anime/donghua/movie/ona). This series is type: ${series.type}`);
  }
  return series;
};

const createEpisode = async (data) => {
  const { seriesId, seasonId, ...rest } = data;
  await assertAnimationSeries(seriesId);

  // Validate seasonId belongs to the same series
  if (seasonId) {
    const season = await seasonRepo.findById(seasonId);
    if (!season) throw new ApiError(404, 'Season not found');
    if (season.series.toString() !== seriesId) {
      throw new ApiError(400, 'Season does not belong to this series');
    }
  }

  // Guard duplicate episode number
  const existing = await episodeRepo.findOne({ series: seriesId, episodeNumber: rest.episodeNumber });
  if (existing) throw new ApiError(409, `Episode ${rest.episodeNumber} already exists for this series`);

  const episode = await episodeRepo.create({
    series: seriesId,
    season: seasonId || null,
    ...rest,
  });

  // Increment episodeCount on the season (if assigned)
  if (seasonId) {
    await seasonRepo.incrementEpisodeCount(seasonId, 1);
  }

  return episode;
};

const getEpisodesBySeries = async (seriesId, query) => {
  await assertAnimationSeries(seriesId);
  const { page, limit, seasonId } = query;
  const { skip, limit: perPage, page: currentPage } = paginate(page, limit);

  const [episodes, total] = await Promise.all([
    episodeRepo.findBySeries({ seriesId, seasonId, skip, limit: perPage }),
    episodeRepo.countBySeries({ seriesId, seasonId }),
  ]);

  return { episodes, meta: paginateMeta(total, currentPage, perPage) };
};

const getEpisodeById = async (id) => {
  const episode = await episodeRepo.findById(id);
  if (!episode) throw new ApiError(404, 'Episode not found');
  // Auto-increment views on fetch
  await episodeRepo.incrementViews(id);
  return episode;
};

const updateEpisode = async (id, data) => {
  const episode = await episodeRepo.updateById(id, data);
  if (!episode) throw new ApiError(404, 'Episode not found');
  return episode;
};

const deleteEpisode = async (id) => {
  const episode = await episodeRepo.findById(id);
  if (!episode) throw new ApiError(404, 'Episode not found');

  await episodeRepo.deleteById(id);

  // Decrement episodeCount on the season (if assigned)
  if (episode.season) {
    await seasonRepo.incrementEpisodeCount(episode.season, -1);
  }

  return episode;
};

module.exports = {
  createEpisode,
  getEpisodesBySeries,
  getEpisodeById,
  updateEpisode,
  deleteEpisode,
};
