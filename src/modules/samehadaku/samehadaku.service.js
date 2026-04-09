'use strict';

/**
 * Samehadaku Service
 * Proxies all requests to the Sanka Vollerei anime API under /samehadaku/
 *
 * Sanka API base: https://www.sankavollerei.com/anime/samehadaku
 */

const { sankaGet } = require('../../shared/utils/sankaClient');

// ── Helpers ───────────────────────────────────────────────────────────────────

const fromSanka = (resp) => resp?.data ?? resp;

// ── Service methods ───────────────────────────────────────────────────────────

/** GET /samehadaku/home */
const getHome = () => sankaGet('/samehadaku/home').then(fromSanka);

/** GET /samehadaku/recent?page=N */
const getRecent = ({ page = 1 } = {}) =>
  sankaGet('/samehadaku/recent', { page }).then(fromSanka);

/** GET /samehadaku/search?q=...&page=N */
const search = ({ q, page = 1 }) =>
  sankaGet('/samehadaku/search', { q, page }).then(fromSanka);

/** GET /samehadaku/ongoing?page=N&order=... */
const getOngoing = ({ page = 1, order = 'update' } = {}) =>
  sankaGet('/samehadaku/ongoing', { page, order }).then(fromSanka);

/** GET /samehadaku/completed?page=N&order=... */
const getCompleted = ({ page = 1, order = 'latest' } = {}) =>
  sankaGet('/samehadaku/completed', { page, order }).then(fromSanka);

/** GET /samehadaku/popular?page=N */
const getPopular = ({ page = 1 } = {}) =>
  sankaGet('/samehadaku/popular', { page }).then(fromSanka);

/** GET /samehadaku/movies?page=N&order=... */
const getMovies = ({ page = 1, order = 'update' } = {}) =>
  sankaGet('/samehadaku/movies', { page, order }).then(fromSanka);

/** GET /samehadaku/list */
const getList = () => sankaGet('/samehadaku/list').then(fromSanka);

/** GET /samehadaku/schedule */
const getSchedule = () => sankaGet('/samehadaku/schedule').then(fromSanka);

/** GET /samehadaku/genres */
const getAllGenres = () => sankaGet('/samehadaku/genres').then(fromSanka);

/** GET /samehadaku/genres/:genreId?page=N */
const getByGenre = (genreId, { page = 1 } = {}) =>
  sankaGet(`/samehadaku/genres/${genreId}`, { page }).then(fromSanka);

/** GET /samehadaku/batch?page=N */
const getBatchList = ({ page = 1 } = {}) =>
  sankaGet('/samehadaku/batch', { page }).then(fromSanka);

/** GET /samehadaku/anime/:animeId */
const getAnimeDetail = (animeId) =>
  sankaGet(`/samehadaku/anime/${animeId}`).then(fromSanka);

/** GET /samehadaku/episode/:episodeId */
const getEpisode = (episodeId) =>
  sankaGet(`/samehadaku/episode/${episodeId}`).then(fromSanka);

/** GET /samehadaku/batch/:batchId */
const getBatch = (batchId) =>
  sankaGet(`/samehadaku/batch/${batchId}`).then(fromSanka);

/** GET /samehadaku/server/:serverId */
const getServer = (serverId) =>
  sankaGet(`/samehadaku/server/${serverId}`).then(fromSanka);

module.exports = {
  getHome,
  getRecent,
  search,
  getOngoing,
  getCompleted,
  getPopular,
  getMovies,
  getList,
  getSchedule,
  getAllGenres,
  getByGenre,
  getBatchList,
  getAnimeDetail,
  getEpisode,
  getBatch,
  getServer,
};
