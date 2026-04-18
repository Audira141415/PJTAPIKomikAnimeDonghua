'use strict';

const svc        = require('./samehadaku.service');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const { pageQuery, searchQuery, ongoingQuery } = require('./samehadaku.validation');

// GET /samehadaku/home
const home = catchAsync(async (req, res) => {
  const data = await svc.getHome();
  success(res, { data });
});

// GET /samehadaku/recent?page=1
const recent = catchAsync(async (req, res) => {
  const { page } = pageQuery.parse(req.query);
  const data = await svc.getRecent({ page });
  success(res, { data });
});

// GET /samehadaku/search?q=...&page=1
const search = catchAsync(async (req, res) => {
  const { q, page } = searchQuery.parse(req.query);
  const data = await svc.search({ q, page });
  success(res, { data });
});

// GET /samehadaku/ongoing?page=1&order=update
const ongoing = catchAsync(async (req, res) => {
  const { page, order } = ongoingQuery.parse(req.query);
  const data = await svc.getOngoing({ page, order });
  success(res, { data });
});

// GET /samehadaku/completed?page=1&order=latest
const completed = catchAsync(async (req, res) => {
  const { page, order } = ongoingQuery.parse(req.query);
  const data = await svc.getCompleted({ page, order });
  success(res, { data });
});

// GET /samehadaku/popular?page=1
const popular = catchAsync(async (req, res) => {
  const { page } = pageQuery.parse(req.query);
  const data = await svc.getPopular({ page });
  success(res, { data });
});

// GET /samehadaku/movies?page=1
const movies = catchAsync(async (req, res) => {
  const { page, order } = ongoingQuery.parse(req.query);
  const data = await svc.getMovies({ page, order });
  success(res, { data });
});

// GET /samehadaku/list
const list = catchAsync(async (req, res) => {
  const data = await svc.getList();
  success(res, { data });
});

// GET /samehadaku/schedule
const schedule = catchAsync(async (req, res) => {
  const data = await svc.getSchedule();
  success(res, { data });
});

// GET /samehadaku/genres
const genres = catchAsync(async (req, res) => {
  const data = await svc.getAllGenres();
  success(res, { data });
});

// GET /samehadaku/genres/:genreId?page=1
const byGenre = catchAsync(async (req, res) => {
  const { page } = pageQuery.parse(req.query);
  const data = await svc.getByGenre(req.params.genreId, { page });
  success(res, { data });
});

// GET /samehadaku/batch?page=1
const batchList = catchAsync(async (req, res) => {
  const { page } = pageQuery.parse(req.query);
  const data = await svc.getBatchList({ page });
  success(res, { data });
});

// GET /samehadaku/anime/:animeId
const animeDetail = catchAsync(async (req, res) => {
  const data = await svc.getAnimeDetail(req.params.animeId);
  success(res, { data });
});

// GET /samehadaku/episode/:episodeId
const episode = catchAsync(async (req, res) => {
  const data = await svc.getEpisode(req.params.episodeId);
  success(res, { data });
});

// GET /samehadaku/batch/:batchId
const batch = catchAsync(async (req, res) => {
  const data = await svc.getBatch(req.params.batchId);
  success(res, { data });
});

// GET /samehadaku/server/:serverId
const server = catchAsync(async (req, res) => {
  const data = await svc.getServer(req.params.serverId);
  success(res, { data });
});

module.exports = {
  home, recent, search, ongoing, completed, popular,
  movies, list, schedule, genres, byGenre, batchList,
  animeDetail, episode, batch, server,
};
