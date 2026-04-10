'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome      = ({ page = 1 } = {})  => sankaGet('/nimegami/home', { page }).then(from);
const search       = (query, { page = 1 } = {}) => sankaGet(`/nimegami/search/${encodeURIComponent(query)}`, { page }).then(from);
const getDetail    = (slug)               => sankaGet(`/nimegami/detail/${slug}`).then(from);
const getAnimeList = ({ page = 1 } = {})  => sankaGet('/nimegami/anime-list', { page }).then(from);
const getGenreList = ()                   => sankaGet('/nimegami/genre/list').then(from);
const getByGenre   = (slug)               => sankaGet(`/nimegami/genre/${slug}`).then(from);
const getSeasonList= ()                   => sankaGet('/nimegami/seasons/list').then(from);
const getBySeason  = (slug)               => sankaGet(`/nimegami/seasons/${slug}`).then(from);
const getTypeList  = ()                   => sankaGet('/nimegami/type/list').then(from);
const getByType    = (slug)               => sankaGet(`/nimegami/type/${slug}`).then(from);
const getJDrama    = ()                   => sankaGet('/nimegami/j-drama').then(from);
const getLiveAction= ()                   => sankaGet('/nimegami/live-action').then(from);
const getLiveDetail= (slug)               => sankaGet(`/nimegami/live-action/${slug}`).then(from);
const getDrama     = (slug)               => sankaGet(`/nimegami/drama/${slug}`).then(from);

module.exports = { getHome, search, getDetail, getAnimeList, getGenreList, getByGenre, getSeasonList, getBySeason, getTypeList, getByType, getJDrama, getLiveAction, getLiveDetail, getDrama };
