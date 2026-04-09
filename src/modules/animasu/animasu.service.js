'use strict';

/**
 * Animasu Service
 * Proxies all requests to the Sanka Vollerei anime API under /animasu/
 */

const { sankaGet } = require('../../shared/utils/sankaClient');

const fromSanka = (resp) => resp?.data ?? resp;

const getHome      = ({ page = 1 } = {})             => sankaGet('/animasu/home',    { page }).then(fromSanka);
const getPopular   = ({ page = 1 } = {})             => sankaGet('/animasu/popular', { page }).then(fromSanka);
const getMovies    = ({ page = 1 } = {})             => sankaGet('/animasu/movies',  { page }).then(fromSanka);
const getOngoing   = ({ page = 1 } = {})             => sankaGet('/animasu/ongoing', { page }).then(fromSanka);
const getCompleted = ({ page = 1 } = {})             => sankaGet('/animasu/completed', { page }).then(fromSanka);
const getLatest    = ({ page = 1 } = {})             => sankaGet('/animasu/latest',  { page }).then(fromSanka);
const search       = (keyword, { page = 1 } = {})    => sankaGet(`/animasu/search/${encodeURIComponent(keyword)}`, { page }).then(fromSanka);
const getAnimeList = ({ letter, page = 1 } = {})     => sankaGet('/animasu/animelist', { letter, page }).then(fromSanka);
const advancedSearch = (params = {})                 => sankaGet('/animasu/advanced-search', params).then(fromSanka);
const getAllGenres  = ()                              => sankaGet('/animasu/genres').then(fromSanka);
const getByGenre   = (slug, { page = 1 } = {})       => sankaGet(`/animasu/genre/${slug}`, { page }).then(fromSanka);
const getCharacters = ()                             => sankaGet('/animasu/characters').then(fromSanka);
const getByCharacter = (slug, { page = 1 } = {})    => sankaGet(`/animasu/character/${slug}`, { page }).then(fromSanka);
const getSchedule  = ()                              => sankaGet('/animasu/schedule').then(fromSanka);
const getDetail    = (slug)                          => sankaGet(`/animasu/detail/${slug}`).then(fromSanka);
const getEpisode   = (slug)                          => sankaGet(`/animasu/episode/${slug}`).then(fromSanka);

module.exports = {
  getHome, getPopular, getMovies, getOngoing, getCompleted, getLatest,
  search, getAnimeList, advancedSearch, getAllGenres, getByGenre,
  getCharacters, getByCharacter, getSchedule, getDetail, getEpisode,
};
