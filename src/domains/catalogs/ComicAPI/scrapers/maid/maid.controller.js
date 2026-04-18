'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const service = require('./maid.service');

const list     = catchAsync(async (req, res) => success(res, await service.list()));
const api      = catchAsync(async (req, res) => success(res, await service.api()));
const latest   = catchAsync(async (req, res) => success(res, await service.latest(req.query.page)));
const manga    = catchAsync(async (req, res) => success(res, await service.manga(req.params.slug)));
const chapter  = catchAsync(async (req, res) => success(res, await service.chapter(req.params.slug)));
const genres   = catchAsync(async (req, res) => success(res, await service.genres()));
const byGenre  = catchAsync(async (req, res) =>
  success(res, await service.byGenre(req.params.slug, req.query.page)));
const search   = catchAsync(async (req, res) =>
  success(res, await service.search(req.query.title, req.query.page)));

module.exports = { list, api, latest, manga, chapter, genres, byGenre, search };
