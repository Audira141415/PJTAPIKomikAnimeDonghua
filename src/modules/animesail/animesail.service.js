'use strict';

/**
 * AnimeSail Service
 * Proxies all requests to the Sanka Vollerei anime API under /animesail/
 */

const { sankaGet } = require('../../shared/utils/sankaClient');

const fromSanka = (resp) => resp?.data ?? resp;

const getHome      = ({ page = 1 } = {})             => sankaGet('/animesail/home',     { page }).then(fromSanka);
const getTerbaru   = ({ page = 1 } = {})             => sankaGet('/animesail/terbaru',  { page }).then(fromSanka);
const getDonghua   = ({ page = 1 } = {})             => sankaGet('/animesail/donghua',  { page }).then(fromSanka);
const getMovies    = ({ page = 1 } = {})             => sankaGet('/animesail/movie',    { page }).then(fromSanka);
const getSchedule  = ()                              => sankaGet('/animesail/schedule').then(fromSanka);
const getList      = ()                              => sankaGet('/animesail/list').then(fromSanka);
const search       = (query)                         => sankaGet(`/animesail/search/${encodeURIComponent(query)}`).then(fromSanka);
const getAllGenres  = ()                              => sankaGet('/animesail/genres').then(fromSanka);
const getByGenre   = (slug, { page = 1 } = {})       => sankaGet(`/animesail/genre/${slug}`,  { page }).then(fromSanka);
const getBySeason  = (slug, { page = 1 } = {})       => sankaGet(`/animesail/season/${slug}`, { page }).then(fromSanka);
const getByStudio  = (slug, { page = 1 } = {})       => sankaGet(`/animesail/studio/${slug}`, { page }).then(fromSanka);
const getDetail    = (slug)                          => sankaGet(`/animesail/detail/${slug}`).then(fromSanka);
const getEpisode   = (slug)                          => sankaGet(`/animesail/episode/${slug}`).then(fromSanka);

module.exports = {
  getHome, getTerbaru, getDonghua, getMovies, getSchedule, getList,
  search, getAllGenres, getByGenre, getBySeason, getByStudio,
  getDetail, getEpisode,
};
