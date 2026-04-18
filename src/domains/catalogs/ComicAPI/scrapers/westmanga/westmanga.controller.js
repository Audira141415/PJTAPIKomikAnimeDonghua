'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const service = require('./westmanga.service');

const home      = catchAsync(async (req, res) => success(res, await service.home()));
const genres    = catchAsync(async (req, res) => success(res, await service.genres()));
const list      = catchAsync(async (req, res) => success(res, await service.list(req.query.page)));
const latest    = catchAsync(async (req, res) => success(res, await service.latest(req.query.page)));
const popular   = catchAsync(async (req, res) => success(res, await service.popular(req.query.page)));
const ongoing   = catchAsync(async (req, res) => success(res, await service.ongoing(req.query.page)));
const completed = catchAsync(async (req, res) => success(res, await service.completed(req.query.page)));
const manga     = catchAsync(async (req, res) => success(res, await service.manga(req.query.page)));
const manhua    = catchAsync(async (req, res) => success(res, await service.manhua(req.query.page)));
const manhwa    = catchAsync(async (req, res) => success(res, await service.manhwa(req.query.page)));
const az        = catchAsync(async (req, res) => success(res, await service.az(req.query.page)));
const za        = catchAsync(async (req, res) => success(res, await service.za(req.query.page)));
const added     = catchAsync(async (req, res) => success(res, await service.added(req.query.page)));
const colored   = catchAsync(async (req, res) => success(res, await service.colored(req.query.page)));
const projects  = catchAsync(async (req, res) => success(res, await service.projects(req.query.page)));
const genre     = catchAsync(async (req, res) =>
  success(res, await service.genre(req.params.id, req.query.page)));
const search    = catchAsync(async (req, res) =>
  success(res, await service.search(req.query.q, req.query.page)));
const detail    = catchAsync(async (req, res) => success(res, await service.detail(req.params.slug)));
const chapter   = catchAsync(async (req, res) => success(res, await service.chapter(req.params.slug)));

module.exports = {
  home, genres, list, latest, popular, ongoing, completed,
  manga, manhua, manhwa, az, za, added, colored, projects,
  genre, search, detail, chapter,
};
