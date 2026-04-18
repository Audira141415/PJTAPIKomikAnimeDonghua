'use strict';

const svc         = require('./anoboy.service');
const catchAsync  = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const { pageQuery, azListQuery, listQuery } = require('./anoboy.validation');

const home      = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);   success(res, { data: await svc.getHome({ page }) }); });
const search    = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);   success(res, { data: await svc.search(req.params.keyword, { page }) }); });
const anime     = catchAsync(async (req, res) => {                                                  success(res, { data: await svc.getAnime(req.params.slug) }); });
const episode   = catchAsync(async (req, res) => {                                                  success(res, { data: await svc.getEpisode(req.params.slug) }); });
const azList    = catchAsync(async (req, res) => { const q = azListQuery.parse(req.query);         success(res, { data: await svc.getAzList(q) }); });
const list      = catchAsync(async (req, res) => { const q = listQuery.parse(req.query);           success(res, { data: await svc.getList(q) }); });
const byGenre   = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query);   success(res, { data: await svc.getByGenre(req.params.slug, { page }) }); });
const genres    = catchAsync(async (req, res) => {                                                  success(res, { data: await svc.getAllGenres() }); });

module.exports = { home, search, anime, episode, azList, list, byGenre, genres };
