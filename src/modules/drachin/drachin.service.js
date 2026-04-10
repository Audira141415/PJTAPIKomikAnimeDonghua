'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome    = ()                          => sankaGet('/drachin/home').then(from);
const getLatest  = ({ page = 1 } = {})         => sankaGet('/drachin/latest', { page }).then(from);
const getPopular = ({ page = 1 } = {})         => sankaGet('/drachin/popular', { page }).then(from);
const search     = (query)                     => sankaGet(`/drachin/search/${encodeURIComponent(query)}`).then(from);
const getDetail  = (slug)                      => sankaGet(`/drachin/detail/${slug}`).then(from);
const getEpisode = (slug, { index } = {})      => sankaGet(`/drachin/episode/${slug}`, { index }).then(from);

module.exports = { getHome, getLatest, getPopular, search, getDetail, getEpisode };
