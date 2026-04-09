'use strict';

/**
 * Kusonime Service
 * Proxies all requests to the Sanka Vollerei anime API under /kusonime/
 */

const { sankaGet } = require('../../shared/utils/sankaClient');

const fromSanka = (resp) => resp?.data ?? resp;

const getLatest    = ({ page = 1 } = {})             => sankaGet('/kusonime/latest',    { page }).then(fromSanka);
const getAllAnime   = ({ page = 1 } = {})             => sankaGet('/kusonime/all-anime', { page }).then(fromSanka);
const getMovies    = ({ page = 1 } = {})             => sankaGet('/kusonime/movie',     { page }).then(fromSanka);
const getByType    = (type, { page = 1 } = {})       => sankaGet(`/kusonime/type/${type}`, { page }).then(fromSanka);
const getAllGenres  = ()                              => sankaGet('/kusonime/all-genres').then(fromSanka);
const getAllSeasons = ()                              => sankaGet('/kusonime/all-seasons').then(fromSanka);
const search       = (query, { page = 1 } = {})      => sankaGet(`/kusonime/search/${encodeURIComponent(query)}`, { page }).then(fromSanka);
const getByGenre   = (slug, { page = 1 } = {})       => sankaGet(`/kusonime/genre/${slug}`, { page }).then(fromSanka);
const getBySeason  = (season, year, { page = 1 } = {}) => sankaGet(`/kusonime/season/${season}/${year}`, { page }).then(fromSanka);
const getDetail    = (slug)                          => sankaGet(`/kusonime/detail/${slug}`).then(fromSanka);

module.exports = {
  getLatest, getAllAnime, getMovies, getByType,
  getAllGenres, getAllSeasons, search,
  getByGenre, getBySeason, getDetail,
};
