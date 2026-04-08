const seasonService    = require('./season.service');
const seasonValidation = require('./season.validation');
const catchAsync       = require('../../shared/utils/catchAsync');
const { success }      = require('../../shared/utils/response');
const { coverFileUrl } = require('../../middlewares/upload.middleware');

const create = catchAsync(async (req, res) => {
  const data = seasonValidation.createSeason.parse(req.body);
  if (req.file) {
    data.coverImage = coverFileUrl(req.file);
  }
  const season = await seasonService.createSeason(data);
  success(res, { statusCode: 201, message: 'Season created', data: season });
});

const getBySeries = catchAsync(async (req, res) => {
  // Supports both /seasons/series/:seriesId and /mangas/:id/seasons
  const seriesId = req.params.seriesId || req.params.id;
  const query = seasonValidation.querySeasons.parse(req.query);
  const result = await seasonService.getSeasonsBySeries(seriesId, query);
  success(res, { data: result.seasons, meta: result.meta });
});

const getById = catchAsync(async (req, res) => {
  const season = await seasonService.getSeasonById(req.params.id);
  success(res, { data: season });
});

const update = catchAsync(async (req, res) => {
  const data = seasonValidation.updateSeason.parse(req.body);
  if (req.file) {
    data.coverImage = coverFileUrl(req.file);
  }
  const season = await seasonService.updateSeason(req.params.id, data);
  success(res, { message: 'Season updated', data: season });
});

const remove = catchAsync(async (req, res) => {
  await seasonService.deleteSeason(req.params.id);
  success(res, { message: 'Season deleted' });
});

module.exports = { create, getBySeries, getById, update, remove };
