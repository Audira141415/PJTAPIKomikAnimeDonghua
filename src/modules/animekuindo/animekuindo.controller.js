'use strict';

const svc = require('./animekuindo.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { z } = require('zod');
const pageQ = z.object({ page: z.coerce.number().int().min(1).default(1) });

const home     = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getHome({ page }) }); });
const schedule = catchAsync(async (req, res) => { success(res, { data: await svc.getSchedule() }); });
const latest   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getLatest({ page }) }); });
const popular  = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getPopular({ page }) }); });
const movies   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getMovies({ page }) }); });
const search   = catchAsync(async (req, res) => { success(res, { data: await svc.search(req.params.query) }); });
const genres   = catchAsync(async (req, res) => { success(res, { data: await svc.getGenres() }); });
const byGenre  = catchAsync(async (req, res) => { success(res, { data: await svc.getByGenre(req.params.slug) }); });
const seasons  = catchAsync(async (req, res) => { success(res, { data: await svc.getSeasons() }); });
const bySeason = catchAsync(async (req, res) => { success(res, { data: await svc.getBySeason(req.params.slug) }); });
const detail   = catchAsync(async (req, res) => { success(res, { data: await svc.getDetail(req.params.slug) }); });
const episode  = catchAsync(async (req, res) => { success(res, { data: await svc.getEpisode(req.params.slug) }); });

module.exports = { home, schedule, latest, popular, movies, search, genres, byGenre, seasons, bySeason, detail, episode };
