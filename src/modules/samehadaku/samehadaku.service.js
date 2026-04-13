'use strict';

/**
 * Samehadaku Service
 * Direct scraper ke v2.samehadaku.how (tidak lagi melalui Sanka Vollerei)
 */

const scraper = require('../../shared/scrapers/samehadaku.scraper');

// ── Service methods ───────────────────────────────────────────────────────────

const getHome       = ()                                   => scraper.getHome();
const getRecent     = ({ page = 1 } = {})                  => scraper.getRecent({ page });
const search        = ({ q, page = 1 })                    => scraper.search({ q, page });
const getOngoing    = ({ page = 1, order = 'update' } = {}) => scraper.getOngoing({ page, order });
const getCompleted  = ({ page = 1, order = 'latest' } = {}) => scraper.getCompleted({ page, order });
const getPopular    = ({ page = 1 } = {})                  => scraper.getPopular({ page });
const getMovies     = ({ page = 1, order = 'update' } = {}) => scraper.getMovies({ page, order });
const getList       = ()                                   => scraper.getList();
const getSchedule   = ()                                   => scraper.getSchedule();
const getAllGenres   = ()                                   => scraper.getAllGenres();
const getByGenre    = (genreId, { page = 1 } = {})         => scraper.getByGenre(genreId, { page });
const getBatchList  = ({ page = 1 } = {})                  => scraper.getBatchList({ page });
const getAnimeDetail = (animeId)                           => scraper.getAnimeDetail(animeId);
const getEpisode    = (episodeId)                          => scraper.getEpisode(episodeId);
const getBatch      = (batchId)                            => scraper.getBatch(batchId);
const getServer     = (serverId)                           => scraper.getServer(serverId);

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
