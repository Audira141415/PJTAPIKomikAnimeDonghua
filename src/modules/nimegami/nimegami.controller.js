'use strict';

const svc = require('./nimegami.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { z } = require('zod');
const pageQ = z.object({ page: z.coerce.number().int().min(1).default(1) });

const home       = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getHome({ page }) }); });
const search     = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.search(req.params.query, { page }) }); });
const detail     = catchAsync(async (req, res) => { success(res, { data: await svc.getDetail(req.params.slug) }); });
const animeList  = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getAnimeList({ page }) }); });
const genreList  = catchAsync(async (req, res) => { success(res, { data: await svc.getGenreList() }); });
const byGenre    = catchAsync(async (req, res) => { success(res, { data: await svc.getByGenre(req.params.slug) }); });
const seasonList = catchAsync(async (req, res) => { success(res, { data: await svc.getSeasonList() }); });
const bySeason   = catchAsync(async (req, res) => { success(res, { data: await svc.getBySeason(req.params.slug) }); });
const typeList   = catchAsync(async (req, res) => { success(res, { data: await svc.getTypeList() }); });
const byType     = catchAsync(async (req, res) => { success(res, { data: await svc.getByType(req.params.slug) }); });
const jDrama     = catchAsync(async (req, res) => { success(res, { data: await svc.getJDrama() }); });
const liveAction = catchAsync(async (req, res) => { success(res, { data: await svc.getLiveAction() }); });
const liveDetail = catchAsync(async (req, res) => { success(res, { data: await svc.getLiveDetail(req.params.slug) }); });
const drama      = catchAsync(async (req, res) => { success(res, { data: await svc.getDrama(req.params.slug) }); });

module.exports = { home, search, detail, animeList, genreList, byGenre, seasonList, bySeason, typeList, byType, jDrama, liveAction, liveDetail, drama };
