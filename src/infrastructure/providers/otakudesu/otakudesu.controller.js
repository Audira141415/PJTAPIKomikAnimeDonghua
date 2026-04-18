'use strict';

const otakudesuService = require('./otakudesu.service');
const catchAsync       = require('@core/utils/catchAsync');
const { success }      = require('@core/utils/response');
const { pageQuery }    = require('./otakudesu.validation');

// GET /anime/home
const home = catchAsync(async (req, res) => {
  const data = await otakudesuService.getHome();
  success(res, { data });
});

// GET /anime/schedule
const schedule = catchAsync(async (req, res) => {
  const data = await otakudesuService.getSchedule();
  success(res, { data });
});

// GET /anime/complete-anime?page=1
const completeAnime = catchAsync(async (req, res) => {
  const { page } = pageQuery.parse(req.query);
  const { pagination, ...rest } = await otakudesuService.getCompleteAnime({ page });
  success(res, { data: rest, pagination });
});

// GET /anime/ongoing-anime?page=1
const ongoingAnime = catchAsync(async (req, res) => {
  const { page } = pageQuery.parse(req.query);
  const { pagination, ...rest } = await otakudesuService.getOngoingAnime({ page });
  success(res, { data: rest, pagination });
});

// GET /anime/genre
const allGenres = catchAsync(async (req, res) => {
  const data = await otakudesuService.getAllGenres();
  success(res, { data });
});

// GET /anime/genre/:slug?page=1
const byGenre = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const { page } = pageQuery.parse(req.query);
  const { pagination, ...rest } = await otakudesuService.getByGenre(slug, { page });
  success(res, { data: rest, pagination });
});

// GET /anime/search/:keyword
const searchAnime = catchAsync(async (req, res) => {
  const { keyword } = req.params;
  const data = await otakudesuService.searchAnime(keyword);
  success(res, { data, pagination: null });
});

// GET /anime/episode/:slug
const episodeDetail = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const data = await otakudesuService.getEpisodeDetail(slug);
  success(res, { data });
});

// GET /anime/batch/:slug
const batch = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const data = await otakudesuService.getBatch(slug);
  success(res, { data });
});

// GET /anime/server/:serverId
const streamServer = catchAsync(async (req, res) => {
  const { serverId } = req.params;
  const data = await otakudesuService.getStreamServer(serverId);
  success(res, { data, pagination: null });
});

// GET /anime/unlimited
const allAnime = catchAsync(async (req, res) => {
  const data = await otakudesuService.getAllAnime();
  success(res, { data });
});

// GET /anime/anime/:slug  (harus PALING BAWAH, setelah semua static route)
const animeDetail = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const data = await otakudesuService.getAnimeDetail(slug);
  success(res, { data });
});

module.exports = {
  home,
  schedule,
  completeAnime,
  ongoingAnime,
  allGenres,
  byGenre,
  searchAnime,
  episodeDetail,
  batch,
  streamServer,
  allAnime,
  animeDetail,
};
