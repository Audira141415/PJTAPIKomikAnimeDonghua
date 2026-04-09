'use strict';

const service = require('./mangakita.service');
const { success } = require('../../../../utils/response');
const catchAsync = require('../../../../utils/catchAsync');

const home        = catchAsync(async (req, res) => success(res, await service.home()));
const list        = catchAsync(async (req, res) => success(res, await service.list({ order: req.query.order, status: req.query.status, type: req.query.type, page: req.query.page })));
const projects    = catchAsync(async (req, res) => success(res, await service.projects(req.params.page || req.query.page)));
const daftarManga = catchAsync(async (req, res) => success(res, await service.daftarManga(req.params.page || req.query.page)));
const genres      = catchAsync(async (req, res) => success(res, await service.genres()));
const byGenre     = catchAsync(async (req, res) => success(res, await service.byGenre(req.params.slug, req.params.page || req.query.page)));
const rekomendasi = catchAsync(async (req, res) => success(res, await service.rekomendasi()));
const search      = catchAsync(async (req, res) => success(res, await service.search(req.params.query, req.params.page || req.query.page)));
const detail      = catchAsync(async (req, res) => success(res, await service.detail(req.params.slug)));
const chapter     = catchAsync(async (req, res) => success(res, await service.chapter(req.params.slug)));

module.exports = { home, list, projects, daftarManga, genres, byGenre, rekomendasi, search, detail, chapter };
