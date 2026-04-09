'use strict';

const svc         = require('./kusonime.service');
const catchAsync  = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');
const { pageQuery } = require('./kusonime.validation');

const latest     = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getLatest({ page }) }); });
const allAnime   = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getAllAnime({ page }) }); });
const movies     = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getMovies({ page }) }); });
const byType     = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getByType(req.params.type, { page }) }); });
const allGenres  = catchAsync(async (req, res) => { success(res, { data: await svc.getAllGenres() }); });
const allSeasons = catchAsync(async (req, res) => { success(res, { data: await svc.getAllSeasons() }); });
const search     = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.search(req.params.query, { page }) }); });
const byGenre    = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getByGenre(req.params.slug, { page }) }); });
const bySeason   = catchAsync(async (req, res) => { const { page } = pageQuery.parse(req.query); success(res, { data: await svc.getBySeason(req.params.season, req.params.year, { page }) }); });
const detail     = catchAsync(async (req, res) => { success(res, { data: await svc.getDetail(req.params.slug) }); });

module.exports = { latest, allAnime, movies, byType, allGenres, allSeasons, search, byGenre, bySeason, detail };
