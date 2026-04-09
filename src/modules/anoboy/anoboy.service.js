'use strict';

/**
 * Anoboy Service
 * Proxies all requests to the Sanka Vollerei anime API under /anoboy/
 */

const { sankaGet } = require('../../shared/utils/sankaClient');

const fromSanka = (resp) => resp?.data ?? resp;

const getHome    = ({ page = 1 } = {})              => sankaGet('/anoboy/home', { page }).then(fromSanka);
const search     = (keyword, { page = 1 } = {})     => sankaGet(`/anoboy/search/${encodeURIComponent(keyword)}`, { page }).then(fromSanka);
const getAnime   = (slug)                           => sankaGet(`/anoboy/anime/${slug}`).then(fromSanka);
const getEpisode = (slug)                           => sankaGet(`/anoboy/episode/${slug}`).then(fromSanka);
const getAzList  = ({ page = 1, show } = {})        => sankaGet('/anoboy/az-list', { page, show }).then(fromSanka);
const getList    = (params = {})                    => sankaGet('/anoboy/list', params).then(fromSanka);
const getByGenre = (slug, { page = 1 } = {})        => sankaGet(`/anoboy/genre/${slug}`, { page }).then(fromSanka);
const getAllGenres = ()                              => sankaGet('/anoboy/genres').then(fromSanka);

module.exports = { getHome, search, getAnime, getEpisode, getAzList, getList, getByGenre, getAllGenres };
