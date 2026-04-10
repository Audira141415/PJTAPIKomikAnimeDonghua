'use strict';

const svc = require('./kuramanime.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { z } = require('zod');
const pageQ = z.object({ page: z.coerce.number().int().min(1).default(1), order_by: z.string().optional() });

const home           = catchAsync(async (req, res) => { success(res, { data: await svc.getHome() }); });
const search         = catchAsync(async (req, res) => { success(res, { data: await svc.search(req.params.keyword) }); });
const animeDetail    = catchAsync(async (req, res) => { success(res, { data: await svc.getAnimeDetail(req.params.id, req.params.slug) }); });
const watch          = catchAsync(async (req, res) => { success(res, { data: await svc.watch(req.params.id, req.params.slug, req.params.episode) }); });
const batch          = catchAsync(async (req, res) => { success(res, { data: await svc.getBatch(req.params.id, req.params.slug, req.params.batchId) }); });
const animeList      = catchAsync(async (req, res) => { const q = pageQ.parse(req.query); success(res, { data: await svc.getAnimeList(q) }); });
const schedule       = catchAsync(async (req, res) => { success(res, { data: await svc.getSchedule({ scheduled_day: req.query.scheduled_day }) }); });
const quick          = catchAsync(async (req, res) => { const q = pageQ.parse(req.query); success(res, { data: await svc.getQuick(req.params.type, q) }); });
const propertyList   = catchAsync(async (req, res) => { success(res, { data: await svc.getPropertyList(req.params.prop) }); });
const propertyDetail = catchAsync(async (req, res) => { success(res, { data: await svc.getPropertyDetail(req.params.prop, req.params.slug) }); });

module.exports = { home, search, animeDetail, watch, batch, animeList, schedule, quick, propertyList, propertyDetail };
