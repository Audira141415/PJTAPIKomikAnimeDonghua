'use strict';

const svc = require('./winbu.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { z } = require('zod');
const pageQ   = z.object({ page: z.coerce.number().int().min(1).default(1) });
const searchQ = z.object({ q: z.string().min(1), page: z.coerce.number().int().min(1).default(1) });

const home         = catchAsync(async (req, res) => { success(res, { data: await svc.getHome() }); });
const search       = catchAsync(async (req, res) => { const q = searchQ.parse(req.query); success(res, { data: await svc.search(q) }); });
const animeDetail  = catchAsync(async (req, res) => { success(res, { data: await svc.getAnimeDetail(req.params.id) }); });
const seriesDetail = catchAsync(async (req, res) => { success(res, { data: await svc.getSeriesDetail(req.params.id) }); });
const filmDetail   = catchAsync(async (req, res) => { success(res, { data: await svc.getFilmDetail(req.params.id) }); });
const episode      = catchAsync(async (req, res) => { success(res, { data: await svc.getEpisodeDetail(req.params.id) }); });
const server       = catchAsync(async (req, res) => { success(res, { data: await svc.getServer(req.query) }); });
const animedonghua = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getAnimeDonghua({ page }) }); });
const filmList     = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getFilmList({ page }) }); });
const seriesList   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getSeriesList({ page }) }); });
const tvshow       = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getTvShow({ page }) }); });
const others       = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getOthers({ page }) }); });
const genres       = catchAsync(async (req, res) => { success(res, { data: await svc.getGenres() }); });
const byGenre      = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getByGenre(req.params.slug, { page }) }); });
const catalog      = catchAsync(async (req, res) => { success(res, { data: await svc.getCatalog(req.query) }); });
const schedule     = catchAsync(async (req, res) => { success(res, { data: await svc.getSchedule({ day: req.query.day }) }); });
const update       = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getUpdate({ page }) }); });
const latest       = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getLatest({ page }) }); });
const ongoing      = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getOngoing({ page }) }); });
const completed    = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getCompleted({ page }) }); });
const populer      = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getPopuler({ page }) }); });
const allAnime     = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getAllAnime({ page }) }); });
const allAnimeRev  = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getAllAnimeRev({ page }) }); });
const listAnime    = catchAsync(async (req, res) => { success(res, { data: await svc.getListAnime(req.query) }); });

module.exports = {
  home, search, animeDetail, seriesDetail, filmDetail, episode, server,
  animedonghua, filmList, seriesList, tvshow, others, genres, byGenre,
  catalog, schedule, update, latest, ongoing, completed, populer,
  allAnime, allAnimeRev, listAnime,
};
