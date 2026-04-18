'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const service = require('./kiryuu.service');

const home     = catchAsync(async (req, res) => success(res, await service.home()));
const latest   = catchAsync(async (req, res) => success(res, await service.latest(req.params.page)));
const popular  = catchAsync(async (req, res) => success(res, await service.popular(req.params.page)));
const trending = catchAsync(async (req, res) => success(res, await service.trending()));
const list     = catchAsync(async (req, res) => success(res, await service.list(req.params.page)));
const genres   = catchAsync(async (req, res) => success(res, await service.genres()));
const genre    = catchAsync(async (req, res) =>
  success(res, await service.genre(req.params.slug, req.params.page)));
const search   = catchAsync(async (req, res) =>
  success(res, await service.search(req.params.query, req.params.page)));
const detail   = catchAsync(async (req, res) => success(res, await service.detail(req.params.slug)));
const chapter  = catchAsync(async (req, res) => success(res, await service.chapter(req.params.slug)));

module.exports = { home, latest, popular, trending, list, genres, genre, search, detail, chapter };
