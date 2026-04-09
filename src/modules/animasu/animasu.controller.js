'use strict';

const svc         = require('./animasu.service');
const catchAsync  = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { pageQuery, animeListQuery, advancedQuery } = require('./animasu.validation');

const home           = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getHome({ page }) }); });
const popular        = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getPopular({ page }) }); });
const movies         = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getMovies({ page }) }); });
const ongoing        = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getOngoing({ page }) }); });
const completed      = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getCompleted({ page }) }); });
const latest         = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getLatest({ page }) }); });
const searchAnime    = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.search(req.params.keyword, { page }) }); });
const animeList      = catchAsync(async (req, res) => { const q = animeListQuery.parse(req.query);                success(res, { data: await svc.getAnimeList(q) }); });
const advSearch      = catchAsync(async (req, res) => { const q = advancedQuery.parse(req.query);                 success(res, { data: await svc.advancedSearch(q) }); });
const genres         = catchAsync(async (req, res) => {                                                            success(res, { data: await svc.getAllGenres() }); });
const byGenre        = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getByGenre(req.params.slug, { page }) }); });
const characters     = catchAsync(async (req, res) => {                                                            success(res, { data: await svc.getCharacters() }); });
const byCharacter    = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);              success(res, { data: await svc.getByCharacter(req.params.slug, { page }) }); });
const schedule       = catchAsync(async (req, res) => {                                                            success(res, { data: await svc.getSchedule() }); });
const detail         = catchAsync(async (req, res) => {                                                            success(res, { data: await svc.getDetail(req.params.slug) }); });
const episode        = catchAsync(async (req, res) => {                                                            success(res, { data: await svc.getEpisode(req.params.slug) }); });

module.exports = {
  home, popular, movies, ongoing, completed, latest,
  searchAnime, animeList, advSearch, genres, byGenre,
  characters, byCharacter, schedule, detail, episode,
};
