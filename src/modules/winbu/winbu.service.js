'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome         = ()                        => sankaGet('/winbu/home').then(from);
const search          = ({ q, page = 1 } = {})    => sankaGet('/winbu/search', { q, page }).then(from);
const getAnimeDetail  = (id)                      => sankaGet(`/winbu/anime/${id}`).then(from);
const getSeriesDetail = (id)                      => sankaGet(`/winbu/series/${id}`).then(from);
const getFilmDetail   = (id)                      => sankaGet(`/winbu/film/${id}`).then(from);
const getEpisodeDetail= (id)                      => sankaGet(`/winbu/episode/${id}`).then(from);
const getServer       = (params = {})             => sankaGet('/winbu/server', params).then(from);
const getAnimeDonghua = ({ page = 1 } = {})       => sankaGet('/winbu/animedonghua', { page }).then(from);
const getFilmList     = ({ page = 1 } = {})       => sankaGet('/winbu/film', { page }).then(from);
const getSeriesList   = ({ page = 1 } = {})       => sankaGet('/winbu/series', { page }).then(from);
const getTvShow       = ({ page = 1 } = {})       => sankaGet('/winbu/tvshow', { page }).then(from);
const getOthers       = ({ page = 1 } = {})       => sankaGet('/winbu/others', { page }).then(from);
const getGenres       = ()                        => sankaGet('/winbu/genres').then(from);
const getByGenre      = (slug, { page = 1 } = {}) => sankaGet(`/winbu/genre/${slug}`, { page }).then(from);
const getCatalog      = (params = {})             => sankaGet('/winbu/catalog', params).then(from);
const getSchedule     = ({ day = 'all' } = {})    => sankaGet('/winbu/schedule', { day }).then(from);
const getUpdate       = ({ page = 1 } = {})       => sankaGet('/winbu/update', { page }).then(from);
const getLatest       = ({ page = 1 } = {})       => sankaGet('/winbu/latest', { page }).then(from);
const getOngoing      = ({ page = 1 } = {})       => sankaGet('/winbu/ongoing', { page }).then(from);
const getCompleted    = ({ page = 1 } = {})       => sankaGet('/winbu/completed', { page }).then(from);
const getPopuler      = ({ page = 1 } = {})       => sankaGet('/winbu/populer', { page }).then(from);
const getAllAnime      = ({ page = 1 } = {})       => sankaGet('/winbu/all-anime', { page }).then(from);
const getAllAnimeRev   = ({ page = 1 } = {})       => sankaGet('/winbu/all-anime-reverse', { page }).then(from);
const getListAnime    = (params = {})             => sankaGet('/winbu/list', params).then(from);

module.exports = {
  getHome, search, getAnimeDetail, getSeriesDetail, getFilmDetail, getEpisodeDetail,
  getServer, getAnimeDonghua, getFilmList, getSeriesList, getTvShow, getOthers,
  getGenres, getByGenre, getCatalog, getSchedule, getUpdate, getLatest, getOngoing,
  getCompleted, getPopuler, getAllAnime, getAllAnimeRev, getListAnime,
};
