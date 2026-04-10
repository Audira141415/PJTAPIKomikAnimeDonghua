'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome    = ()                         => sankaGet('/donghub/home').then(from);
const getLatest  = ({ page = 1 } = {})        => sankaGet('/donghub/latest', { page }).then(from);
const getPopular = ({ page = 1 } = {})        => sankaGet('/donghub/popular', { page }).then(from);
const getMovies  = ({ page = 1 } = {})        => sankaGet('/donghub/movie', { page }).then(from);
const getSchedule= ()                          => sankaGet('/donghub/schedule').then(from);
const search     = (query)                    => sankaGet(`/donghub/search/${encodeURIComponent(query)}`).then(from);
const getByGenre = (slug)                     => sankaGet(`/donghub/genre/${slug}`).then(from);
const getList    = (params = {})              => sankaGet('/donghub/list', params).then(from);
const getDetail  = (slug)                     => sankaGet(`/donghub/detail/${slug}`).then(from);
const getEpisode = (slug)                     => sankaGet(`/donghub/episode/${slug}`).then(from);

module.exports = { getHome, getLatest, getPopular, getMovies, getSchedule, search, getByGenre, getList, getDetail, getEpisode };
