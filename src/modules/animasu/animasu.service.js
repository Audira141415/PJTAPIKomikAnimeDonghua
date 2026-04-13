'use strict';

const animasu = require('../../shared/scrapers/animasu.scraper');

module.exports = {
  getHome: animasu.getHome,
  getPopular: animasu.getPopular,
  getMovies: animasu.getMovies,
  getOngoing: animasu.getOngoing,
  getCompleted: animasu.getCompleted,
  getLatest: animasu.getLatest,
  search: animasu.search,
  getAnimeList: animasu.getAnimeList,
  advancedSearch: animasu.advancedSearch,
  getAllGenres: animasu.getAllGenres,
  getByGenre: animasu.getByGenre,
  getCharacters: animasu.getCharacters,
  getByCharacter: animasu.getByCharacter,
  getSchedule: animasu.getSchedule,
  getDetail: animasu.getDetail,
  getEpisode: animasu.getEpisode,
};
