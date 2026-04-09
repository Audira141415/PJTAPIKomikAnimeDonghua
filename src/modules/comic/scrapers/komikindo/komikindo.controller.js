'use strict';

const catchAsync = require('../../../../utils/catchAsync');
const { success } = require('../../../../utils/response');
const service = require('./komikindo.service');

const latest  = catchAsync(async (req, res) => success(res, await service.latest(req.params.page)));
const detail  = catchAsync(async (req, res) => success(res, await service.detail(req.params.slug)));
const chapter = catchAsync(async (req, res) => success(res, await service.chapter(req.params.slug)));
const library = catchAsync(async (req, res) => success(res, await service.library(req.query.page)));
const genres  = catchAsync(async (req, res) => success(res, await service.genres()));
const search  = catchAsync(async (req, res) =>
  success(res, await service.search(req.params.query, req.params.page)));
const config  = catchAsync(async (req, res) => success(res, await service.config()));
const list    = catchAsync(async (req, res) => success(res, await service.list()));
const populer = catchAsync(async (req, res) => success(res, await service.populer(req.params.page)));

module.exports = { latest, detail, chapter, library, genres, search, config, list, populer };
