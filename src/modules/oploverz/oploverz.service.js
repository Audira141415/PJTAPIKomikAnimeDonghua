'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome      = ({ page = 1 } = {})              => sankaGet('/oploverz/home', { page }).then(from);
const getSchedule  = ()                               => sankaGet('/oploverz/schedule').then(from);
const getOngoing   = ({ page = 1 } = {})              => sankaGet('/oploverz/ongoing', { page }).then(from);
const getCompleted = ({ page = 1 } = {})              => sankaGet('/oploverz/completed', { page }).then(from);
const getList      = ({ page = 1, status, type, order } = {}) =>
  sankaGet('/oploverz/list', { page, status, type, order }).then(from);
const search       = (query, { page = 1 } = {})       => sankaGet(`/oploverz/search/${encodeURIComponent(query)}`, { page }).then(from);
const getAnime     = (slug)                           => sankaGet(`/oploverz/anime/${slug}`).then(from);
const getEpisode   = (slug)                           => sankaGet(`/oploverz/episode/${slug}`).then(from);

module.exports = { getHome, getSchedule, getOngoing, getCompleted, getList, search, getAnime, getEpisode };
