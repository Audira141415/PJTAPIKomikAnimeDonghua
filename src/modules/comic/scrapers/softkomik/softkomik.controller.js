'use strict';

const catchAsync = require('../../../../utils/catchAsync');
const { success } = require('../../../../utils/response');
const service = require('./softkomik.service');

const home    = catchAsync(async (req, res) => success(res, await service.home()));
const latest  = catchAsync(async (req, res) => success(res, await service.latest(req.query.page)));
const popular = catchAsync(async (req, res) => success(res, await service.popular(req.query.page)));
const list    = catchAsync(async (req, res) => success(res, await service.list(req.query.page)));
const genres  = catchAsync(async (req, res) => success(res, await service.genres()));
const genre   = catchAsync(async (req, res) =>
  success(res, await service.genre(req.params.slug, req.query.page)));
const search  = catchAsync(async (req, res) =>
  success(res, await service.search(req.query.q, req.query.page)));
const detail  = catchAsync(async (req, res) => success(res, await service.detail(req.params.slug)));
const chapter = catchAsync(async (req, res) => success(res, await service.chapter(req.params.slug)));

module.exports = { home, latest, popular, list, genres, genre, search, detail, chapter };
