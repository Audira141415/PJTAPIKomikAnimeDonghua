'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome    = ({ page = 1 } = {})        => sankaGet('/alqanime/home', { page }).then(from);
const getSchedule= ()                          => sankaGet('/alqanime/schedule').then(from);
const getPopular = ({ page = 1 } = {})        => sankaGet('/alqanime/popular', { page }).then(from);
const getList    = ({ show = 'all' } = {})     => sankaGet('/alqanime/list', { show }).then(from);
const getOngoing = ({ page = 1 } = {})        => sankaGet('/alqanime/ongoing', { page }).then(from);
const getCompleted=({ page = 1 } = {})        => sankaGet('/alqanime/completed', { page }).then(from);
const getMovies  = ({ page = 1 } = {})        => sankaGet('/alqanime/movie', { page }).then(from);
const search     = (query, { page = 1 } = {}) => sankaGet(`/alqanime/search/${encodeURIComponent(query)}`, { page }).then(from);
const getGenres  = ()                          => sankaGet('/alqanime/genres').then(from);
const getByGenre = (slug, { page = 1 } = {})  => sankaGet(`/alqanime/genre/${slug}`, { page }).then(from);
const getBySeason= (slug)                      => sankaGet(`/alqanime/season/${slug}`).then(from);
const getDetail  = (slug)                      => sankaGet(`/alqanime/detail/${slug}`).then(from);

module.exports = { getHome, getSchedule, getPopular, getList, getOngoing, getCompleted, getMovies, search, getGenres, getByGenre, getBySeason, getDetail };
