'use strict';

const catchAsync = require('../../../../utils/catchAsync');
const { success } = require('../../../../utils/response');
const service = require('./meganei.service');

const home    = catchAsync(async (req, res) => success(res, await service.home()));
const hot     = catchAsync(async (req, res) => success(res, await service.hot()));
const latest  = catchAsync(async (req, res) => success(res, await service.latest(req.query.page)));
const genres  = catchAsync(async (req, res) => success(res, await service.genres()));
const genre   = catchAsync(async (req, res) =>
  success(res, await service.genre(req.params.slug, req.query.page)));
const search  = catchAsync(async (req, res) =>
  success(res, await service.search(req.query.q, req.query.page)));
const detail  = catchAsync(async (req, res) => success(res, await service.detail(req.params.slug)));
const chapter = catchAsync(async (req, res) => success(res, await service.chapter(req.params.slug)));

module.exports = { home, hot, latest, genres, genre, search, detail, chapter };
