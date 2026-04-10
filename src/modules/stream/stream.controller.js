'use strict';

const svc = require('./stream.service');
const catchAsync = require('../../shared/utils/catchAsync');
const { success } = require('../../shared/utils/response');

const latest  = catchAsync(async (req, res) => { success(res, { data: await svc.getLatest(req.params.page || 1) }); });
const popular = catchAsync(async (req, res) => { success(res, { data: await svc.getPopular() }); });
const search  = catchAsync(async (req, res) => { success(res, { data: await svc.search(req.params.query) }); });
const anime   = catchAsync(async (req, res) => { success(res, { data: await svc.getAnime(req.params.slug) }); });
const episode = catchAsync(async (req, res) => { success(res, { data: await svc.getEpisode(req.params.slug) }); });
const movies  = catchAsync(async (req, res) => { success(res, { data: await svc.getMovies(req.params.page || 1) }); });
const list    = catchAsync(async (req, res) => { success(res, { data: await svc.getList() }); });
const genres  = catchAsync(async (req, res) => { success(res, { data: await svc.getGenres() }); });
const byGenre = catchAsync(async (req, res) => { success(res, { data: await svc.getByGenre(req.params.slug, req.params.page || 1) }); });

module.exports = { latest, popular, search, anime, episode, movies, list, genres, byGenre };
