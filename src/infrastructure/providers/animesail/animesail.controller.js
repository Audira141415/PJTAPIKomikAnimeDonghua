'use strict';

const svc         = require('./animesail.service');
const catchAsync  = require('@core/utils/catchAsync');
const { success } = require('@core/utils/response');
const { pageQuery } = require('./animesail.validation');

const home      = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getHome({ page }) }); });
const terbaru   = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getTerbaru({ page }) }); });
const donghua   = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getDonghua({ page }) }); });
const movies    = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getMovies({ page }) }); });
const schedule  = catchAsync(async (req, res) => {                                               success(res, { data: await svc.getSchedule() }); });
const list      = catchAsync(async (req, res) => {                                               success(res, { data: await svc.getList() }); });
const search    = catchAsync(async (req, res) => {                                               success(res, { data: await svc.search(req.params.query) }); });
const genres    = catchAsync(async (req, res) => {                                               success(res, { data: await svc.getAllGenres() }); });
const byGenre   = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getByGenre(req.params.slug, { page }) }); });
const bySeason  = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getBySeason(req.params.slug, { page }) }); });
const byStudio  = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getByStudio(req.params.slug, { page }) }); });
const detail    = catchAsync(async (req, res) => {                                               success(res, { data: await svc.getDetail(req.params.slug) }); });
const episode   = catchAsync(async (req, res) => {                                               success(res, { data: await svc.getEpisode(req.params.slug) }); });

module.exports = { home, terbaru, donghua, movies, schedule, list, search, genres, byGenre, bySeason, byStudio, detail, episode };
