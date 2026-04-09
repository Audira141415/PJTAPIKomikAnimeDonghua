'use strict';

const service = require('./komikstation.service');
const { success } = require('../../../../utils/response');
const catchAsync = require('../../../../utils/catchAsync');

const home           = catchAsync(async (req, res) => success(res, await service.home()));
const list           = catchAsync(async (req, res) => success(res, await service.list({ type: req.query.type, status: req.query.status, order: req.query.order, page: req.query.page })));
const popular        = catchAsync(async (req, res) => success(res, await service.popular(req.query.page)));
const recommendation = catchAsync(async (req, res) => success(res, await service.recommendation()));
const topWeekly      = catchAsync(async (req, res) => success(res, await service.topWeekly()));
const ongoing        = catchAsync(async (req, res) => success(res, await service.ongoing(req.query.page)));
const azList         = catchAsync(async (req, res) => success(res, await service.azList(req.params.letter, req.query.page)));
const genres         = catchAsync(async (req, res) => success(res, await service.genres()));
const byGenre        = catchAsync(async (req, res) => success(res, await service.byGenre(req.params.slug, req.params.page || req.query.page)));
const searchComics   = catchAsync(async (req, res) => success(res, await service.searchComics(req.params.query, req.params.page || req.query.page)));
const mangaDetail    = catchAsync(async (req, res) => success(res, await service.mangaDetail(req.params.slug)));
const chapterRead    = catchAsync(async (req, res) => success(res, await service.chapterRead(req.params.slug)));

module.exports = { home, list, popular, recommendation, topWeekly, ongoing, azList, genres, byGenre, searchComics, mangaDetail, chapterRead };
