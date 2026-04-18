'use strict';

const svc = require('./donghub.service');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const { z } = require('zod');
const pageQ = z.object({ page: z.coerce.number().int().min(1).default(1) });

const home     = catchAsync(async (req, res) => { success(res, { data: await svc.getHome() }); });
const latest   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getLatest({ page }) }); });
const popular  = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getPopular({ page }) }); });
const movies   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getMovies({ page }) }); });
const schedule = catchAsync(async (req, res) => { success(res, { data: await svc.getSchedule() }); });
const search   = catchAsync(async (req, res) => { success(res, { data: await svc.search(req.params.query) }); });
const byGenre  = catchAsync(async (req, res) => { success(res, { data: await svc.getByGenre(req.params.slug) }); });
const list     = catchAsync(async (req, res) => { success(res, { data: await svc.getList(req.query) }); });
const detail   = catchAsync(async (req, res) => { success(res, { data: await svc.getDetail(req.params.slug) }); });
const episode  = catchAsync(async (req, res) => { success(res, { data: await svc.getEpisode(req.params.slug) }); });

module.exports = { home, latest, popular, movies, schedule, search, byGenre, list, detail, episode };
