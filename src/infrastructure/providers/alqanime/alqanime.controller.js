'use strict';

const svc = require('./alqanime.service');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const { z } = require('zod');
const pageQ = z.object({ page: z.coerce.number().int().min(1).default(1) });
const listQ = z.object({ show: z.string().optional().default('all') });

const home      = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query);  success(res, { data: await svc.getHome({ page }) }); });
const schedule  = catchAsync(async (req, res) => { success(res, { data: await svc.getSchedule() }); });
const popular   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query);  success(res, { data: await svc.getPopular({ page }) }); });
const list      = catchAsync(async (req, res) => { const { show } = listQ.parse(req.query);  success(res, { data: await svc.getList({ show }) }); });
const ongoing   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query);  success(res, { data: await svc.getOngoing({ page }) }); });
const completed = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query);  success(res, { data: await svc.getCompleted({ page }) }); });
const movies    = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query);  success(res, { data: await svc.getMovies({ page }) }); });
const search    = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query);  success(res, { data: await svc.search(req.params.query, { page }) }); });
const genres    = catchAsync(async (req, res) => { success(res, { data: await svc.getGenres() }); });
const byGenre   = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query);  success(res, { data: await svc.getByGenre(req.params.slug, { page }) }); });
const bySeason  = catchAsync(async (req, res) => { success(res, { data: await svc.getBySeason(req.params.slug) }); });
const detail    = catchAsync(async (req, res) => { success(res, { data: await svc.getDetail(req.params.slug) }); });

module.exports = { home, schedule, popular, list, ongoing, completed, movies, search, genres, byGenre, bySeason, detail };
