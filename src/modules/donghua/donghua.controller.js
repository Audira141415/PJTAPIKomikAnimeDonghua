const donghuaService = require('./donghua.service');
const catchAsync     = require('../../shared/utils/catchAsync');
const { success }    = require('../../shared/utils/response');

// GET /donghua/home
const home = catchAsync(async (req, res) => {
  const data = await donghuaService.getHome();
  success(res, { data });
});

// GET /donghua/ongoing?page=1&limit=20
const ongoing = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await donghuaService.getOngoing({ page, limit });
  success(res, { data: result.ongoing_donghua, meta: result.meta });
});

// GET /donghua/completed?page=1&limit=20
const completed = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await donghuaService.getCompleted({ page, limit });
  success(res, { data: result.completed_donghua, meta: result.meta });
});

// GET /donghua/search?q=battle+through&page=1&limit=20
const search = catchAsync(async (req, res) => {
  const { q, page, limit } = req.query;
  const result = await donghuaService.search({ q, page, limit });
  success(res, { data: result.results, meta: result.meta, message: `Hasil pencarian: ${result.query}` });
});

// GET /donghua/genres
const genres = catchAsync(async (req, res) => {
  const data = await donghuaService.getGenres();
  success(res, { data });
});

// GET /donghua/genre/:genre?page=1&limit=20
const byGenre = catchAsync(async (req, res) => {
  const { genre } = req.params;
  const { page, limit } = req.query;
  const result = await donghuaService.getByGenre(genre, { page, limit });
  success(res, { data: result.donghua, meta: result.meta, message: `Donghua genre: ${result.genre}` });
});

// GET /donghua/year/:year?page=1&limit=20
const byYear = catchAsync(async (req, res) => {
  const { year } = req.params;
  const { page, limit } = req.query;
  const result = await donghuaService.getByYear(year, { page, limit });
  success(res, { data: result.donghua, meta: result.meta, message: `Donghua tahun: ${result.year}` });
});

// GET /donghua/:slug
const detail = catchAsync(async (req, res) => {
  const data = await donghuaService.getDetail(req.params.slug);
  success(res, { data });
});

// GET /donghua/episode/:episodeSlug
const watchEpisode = catchAsync(async (req, res) => {
  const { episodeSlug } = req.params;
  const data = await donghuaService.watchEpisode(episodeSlug);
  success(res, { data });
});

module.exports = {
  home,
  ongoing,
  completed,
  search,
  genres,
  byGenre,
  byYear,
  detail,
  watchEpisode,
};
