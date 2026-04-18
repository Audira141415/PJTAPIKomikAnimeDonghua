'use strict';

const service = require('./bacakomik.service');
const { success } = require('@core/utils/response');
const catchAsync = require('@core/utils/catchAsync');

const latest       = catchAsync(async (req, res) => {
  const data = await service.latest(req.query.page);
  success(res, data);
});

const populer      = catchAsync(async (req, res) => {
  const data = await service.populer(req.query.page);
  success(res, data);
});

const top          = catchAsync(async (req, res) => {
  const data = await service.top();
  success(res, data);
});

const list         = catchAsync(async (req, res) => {
  const data = await service.list(req.query.page);
  success(res, data);
});

const search       = catchAsync(async (req, res) => {
  const data = await service.search(req.params.query, req.query.page);
  success(res, data);
});

const genres       = catchAsync(async (req, res) => {
  const data = await service.genres();
  success(res, data);
});

const byGenre      = catchAsync(async (req, res) => {
  const data = await service.byGenre(req.params.genre, req.query.page);
  success(res, data);
});

const byType       = catchAsync(async (req, res) => {
  const data = await service.byType(req.params.type, req.query.page);
  success(res, data);
});

const komikBerwarna = catchAsync(async (req, res) => {
  const data = await service.komikBerwarna(req.params.page || 1);
  success(res, data);
});

const recomen      = catchAsync(async (req, res) => {
  const data = await service.recomen();
  success(res, data);
});

const detail       = catchAsync(async (req, res) => {
  const data = await service.detail(req.params.slug);
  success(res, data);
});

const chapter      = catchAsync(async (req, res) => {
  const data = await service.chapter(req.params.slug);
  success(res, data);
});

module.exports = { latest, populer, top, list, search, genres, byGenre, byType, komikBerwarna, recomen, detail, chapter };
