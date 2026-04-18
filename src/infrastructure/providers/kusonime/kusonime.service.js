'use strict';

/**
 * Kusonime Service
 * Direct scraper service (tanpa proxy Sanka).
 */

const kusonime = require('@scrapers/kusonime.scraper');

const getLatest    = ({ page = 1 } = {})               => kusonime.getLatest({ page });
const getAllAnime  = ({ page = 1 } = {})               => kusonime.getAllAnime({ page });
const getMovies    = ({ page = 1 } = {})               => kusonime.getMovies({ page });
const getByType    = (type, { page = 1 } = {})         => kusonime.getByType(type, { page });
const getAllGenres = ()                                => kusonime.getAllGenres();
const getAllSeasons= ()                                => kusonime.getAllSeasons();
const search       = (query, { page = 1 } = {})        => kusonime.search(query, { page });
const getByGenre   = (slug, { page = 1 } = {})         => kusonime.getByGenre(slug, { page });
const getBySeason  = (season, year, { page = 1 } = {}) => kusonime.getBySeason(season, year, { page });
const getDetail    = (slug)                            => kusonime.getDetail(slug);

module.exports = {
  getLatest, getAllAnime, getMovies, getByType,
  getAllGenres, getAllSeasons, search,
  getByGenre, getBySeason, getDetail,
};
