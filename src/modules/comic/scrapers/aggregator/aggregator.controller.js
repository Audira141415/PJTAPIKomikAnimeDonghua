'use strict';

const catchAsync = require('../../../../utils/catchAsync');
const { success } = require('../../../../utils/response');
const service = require('./aggregator.service');

const sources = catchAsync(async (req, res) =>
  success(res, service.sources()));

const latest = catchAsync(async (req, res) =>
  success(res, await service.latest(req.query.sources, req.query.page)));

const search = catchAsync(async (req, res) =>
  success(res, await service.search(req.query.q, req.query.sources, req.query.page)));

module.exports = { sources, latest, search };
