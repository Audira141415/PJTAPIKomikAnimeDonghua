const mangaService     = require('./manga.service');
const mangaValidation  = require('./manga.validation');
const catchAsync       = require('../../shared/utils/catchAsync');
const { success }      = require('../../shared/utils/response');
const { coverFileUrl } = require('../../middlewares/upload.middleware');
const { mirrorImage } = require('../../shared/utils/imageDownloader');

const create = catchAsync(async (req, res) => {
  const data = mangaValidation.createManga.parse(req.body);
  if (req.file) {
    data.coverImage = coverFileUrl(req.file);
  } else if (data.coverImage && data.coverImage.startsWith('http')) {
    data.coverImage = await mirrorImage(data.coverImage, data.type || 'unknown', data.slug || Date.now().toString());
  }
  const manga = await mangaService.createManga(data, req.user.id);
  success(res, { statusCode: 201, message: 'Series created', data: manga });
});

const getAll = catchAsync(async (req, res) => {
  const query = mangaValidation.queryManga.parse(req.query);
  const result = await mangaService.getMangaList(query);
  success(res, { data: result.mangas, meta: result.meta });
});

const getBySlug = catchAsync(async (req, res) => {
  const manga = await mangaService.getMangaBySlug(req.params.slug);
  success(res, { data: manga });
});

const update = catchAsync(async (req, res) => {
  const data = mangaValidation.updateManga.parse(req.body);
  if (req.file) {
    data.coverImage = coverFileUrl(req.file);
  } else if (data.coverImage && data.coverImage.startsWith('http')) {
    data.coverImage = await mirrorImage(data.coverImage, data.type || 'unknown', req.params.slug || req.params.id);
  }
  const manga = await mangaService.updateManga(req.params.id, data);
  success(res, { message: 'Series updated', data: manga });
});

const remove = catchAsync(async (req, res) => {
  await mangaService.deleteManga(req.params.id);
  success(res, { message: 'Series deleted' });
});

const rate = catchAsync(async (req, res) => {
  const { score } = mangaValidation.rateManga.parse(req.body);
  const result = await mangaService.rateContent(req.params.id, req.user.id, score);
  success(res, { message: 'Rating submitted', data: result });
});

const recommendations = catchAsync(async (req, res) => {
  const results = await mangaService.getRecommendations(req.params.id);
  success(res, { data: results });
});

module.exports = { create, getAll, getBySlug, update, remove, rate, recommendations };
