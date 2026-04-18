'use strict';

const catchAsync = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const service = require('./aggregator.service');

const sources = catchAsync(async (req, res) =>
  success(res, { data: service.sources() }));

const latest = catchAsync(async (req, res) =>
  success(res, { data: await service.latest(req.query.sources, req.query.page, req.query.type) }));

const search = catchAsync(async (req, res) =>
  success(res, { data: await service.search(req.query.q, req.query.sources, req.query.page, req.query.type) }));

module.exports = { sources, latest, search };
