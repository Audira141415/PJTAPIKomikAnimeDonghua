'use strict';

const svc = require('./drachin.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { z } = require('zod');
const pageQ   = z.object({ page: z.coerce.number().int().min(1).default(1) });
const episodeQ= z.object({ index: z.coerce.number().int().min(1).optional() });

const home    = catchAsync(async (req, res) => { success(res, { data: await svc.getHome() }); });
const latest  = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getLatest({ page }) }); });
const popular = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getPopular({ page }) }); });
const search  = catchAsync(async (req, res) => { success(res, { data: await svc.search(req.params.query) }); });
const detail  = catchAsync(async (req, res) => { success(res, { data: await svc.getDetail(req.params.slug) }); });
const episode = catchAsync(async (req, res) => { const q = episodeQ.parse(req.query); success(res, { data: await svc.getEpisode(req.params.slug, q) }); });

module.exports = { home, latest, popular, search, detail, episode };
