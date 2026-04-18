'use strict';

const svc        = require('./oploverz.service');
const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const { pageQuery, searchQuery, listQuery } = require('./oploverz.validation');

const home     = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);   success(res, { data: await svc.getHome({ page }) }); });
const schedule = catchAsync(async (req, res) => { success(res, { data: await svc.getSchedule() }); });
const ongoing  = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);   success(res, { data: await svc.getOngoing({ page }) }); });
const completed= catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);   success(res, { data: await svc.getCompleted({ page }) }); });
const list     = catchAsync(async (req, res) => { const q = listQuery.parse(req.query);           success(res, { data: await svc.getList(q) }); });
const search   = catchAsync(async (req, res) => { const { page } = searchQuery.parse(req.query); success(res, { data: await svc.search(req.params.query, { page }) }); });
const anime    = catchAsync(async (req, res) => { success(res, { data: await svc.getAnime(req.params.slug) }); });
const episode  = catchAsync(async (req, res) => { success(res, { data: await svc.getEpisode(req.params.slug) }); });

module.exports = { home, schedule, ongoing, completed, list, search, anime, episode };
