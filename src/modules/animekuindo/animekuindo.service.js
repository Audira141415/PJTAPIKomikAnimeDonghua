'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome    = ({ page = 1 } = {})  => sankaGet('/animekuindo/home', { page }).then(from);
const getSchedule= ()                   => sankaGet('/animekuindo/schedule').then(from);
const getLatest  = ({ page = 1 } = {})  => sankaGet('/animekuindo/latest', { page }).then(from);
const getPopular = ({ page = 1 } = {})  => sankaGet('/animekuindo/popular', { page }).then(from);
const getMovies  = ({ page = 1 } = {})  => sankaGet('/animekuindo/movie', { page }).then(from);
const search     = (query)              => sankaGet(`/animekuindo/search/${encodeURIComponent(query)}`).then(from);
const getGenres  = ()                   => sankaGet('/animekuindo/genres').then(from);
const getByGenre = (slug)               => sankaGet(`/animekuindo/genres/${slug}`).then(from);
const getSeasons = ()                   => sankaGet('/animekuindo/seasons').then(from);
const getBySeason= (slug)               => sankaGet(`/animekuindo/seasons/${slug}`).then(from);
const getDetail  = (slug)               => sankaGet(`/animekuindo/detail/${slug}`).then(from);
const getEpisode = (slug)               => sankaGet(`/animekuindo/episode/${slug}`).then(from);

module.exports = { getHome, getSchedule, getLatest, getPopular, getMovies, search, getGenres, getByGenre, getSeasons, getBySeason, getDetail, getEpisode };
