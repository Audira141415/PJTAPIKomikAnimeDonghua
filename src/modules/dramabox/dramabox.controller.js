'use strict';

const svc = require('./dramabox.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { z } = require('zod');
const pageQ   = z.object({ page: z.coerce.number().int().min(1).default(1) });
const searchQ = z.object({ q: z.string().min(1), page: z.coerce.number().int().min(1).default(1) });
const streamQ = z.object({ bookId: z.string().min(1), episode: z.coerce.number().int().min(1) });
const detailQ = z.object({ bookId: z.string().min(1) });

const search    = catchAsync(async (req, res) => { const q = searchQ.parse(req.query);  success(res, { data: await svc.search(q) }); });
const latest    = catchAsync(async (req, res) => { const { page } = pageQ.parse(req.query); success(res, { data: await svc.getLatest({ page }) }); });
const trending  = catchAsync(async (req, res) => { success(res, { data: await svc.getTrending() }); });
const detail    = catchAsync(async (req, res) => { const q = detailQ.parse(req.query);  success(res, { data: await svc.getDetail(q) }); });
const stream    = catchAsync(async (req, res) => { const q = streamQ.parse(req.query);  success(res, { data: await svc.getStream(q) }); });
const authRefresh=catchAsync(async (req, res) => { success(res, { data: await svc.refreshAuth() }); });

module.exports = { search, latest, trending, detail, stream, authRefresh };
