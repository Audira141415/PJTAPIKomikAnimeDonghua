const episodeService    = require('./episode.service');
const episodeValidation = require('./episode.validation');
const catchAsync        = require('@core/utils/catchAsync');
const { success }       = require('@core/utils/response');
const { coverFileUrl }  = require('@middlewares/upload.middleware');

const create = catchAsync(async (req, res) => {
  const data = episodeValidation.createEpisode.parse(req.body);
  if (req.file) {
    data.thumbnail = coverFileUrl(req.file);
  }
  const episode = await episodeService.createEpisode(data);
  success(res, { statusCode: 201, message: 'Episode created', data: episode });
});

const getBySeries = catchAsync(async (req, res) => {
  // Supports both /episodes/series/:seriesId and /mangas/:id/episodes
  const seriesId = req.params.seriesId || req.params.id;
  const query = episodeValidation.queryEpisodes.parse(req.query);
  const result = await episodeService.getEpisodesBySeries(seriesId, query);
  success(res, { data: result.episodes, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const episode = await episodeService.getEpisodeById(req.params.id);
  success(res, { data: episode });
});

const update = catchAsync(async (req, res) => {
  const data = episodeValidation.updateEpisode.parse(req.body);
  if (req.file) {
    data.thumbnail = coverFileUrl(req.file);
  }
  const episode = await episodeService.updateEpisode(req.params.id, data);
  success(res, { message: 'Episode updated', data: episode });
});

const remove = catchAsync(async (req, res) => {
  await episodeService.deleteEpisode(req.params.id);
  success(res, { message: 'Episode deleted' });
});

module.exports = { create, getBySeries, getById, update, remove };
