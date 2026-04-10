'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getHome         = ()                             => sankaGet('/kura/home').then(from);
const search          = (keyword)                      => sankaGet(`/kura/search/${encodeURIComponent(keyword)}`).then(from);
const getAnimeDetail  = (id, slug)                     => sankaGet(`/kura/anime/${id}/${slug}`).then(from);
const watch           = (id, slug, episode)            => sankaGet(`/kura/watch/${id}/${slug}/${episode}`).then(from);
const getBatch        = (id, slug, batchId)            => sankaGet(`/kura/batch/${id}/${slug}/${batchId}`).then(from);
const getAnimeList    = ({ page = 1, order_by } = {})  => sankaGet('/kura/anime-list', { page, order_by }).then(from);
const getSchedule     = ({ scheduled_day } = {})       => sankaGet('/kura/schedule', { scheduled_day }).then(from);
const getQuick        = (type, { page = 1, order_by } = {}) => sankaGet(`/kura/quick/${type}`, { page, order_by }).then(from);
const getPropertyList = (prop)                         => sankaGet(`/kura/properties/${prop}`).then(from);
const getPropertyDetail=(prop, slug)                   => sankaGet(`/kura/properties/${prop}/${slug}`).then(from);

module.exports = { getHome, search, getAnimeDetail, watch, getBatch, getAnimeList, getSchedule, getQuick, getPropertyList, getPropertyDetail };
