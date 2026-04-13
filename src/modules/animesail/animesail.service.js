'use strict';

const animesail = require('../../shared/scrapers/animesail.scraper');

module.exports = {
  getHome: animesail.getHome,
  getTerbaru: animesail.getTerbaru,
  getDonghua: animesail.getDonghua,
  getMovies: animesail.getMovies,
  getSchedule: animesail.getSchedule,
  getList: animesail.getList,
  search: animesail.search,
  getAllGenres: animesail.getAllGenres,
  getByGenre: animesail.getByGenre,
  getBySeason: animesail.getBySeason,
  getByStudio: animesail.getByStudio,
  getDetail: animesail.getDetail,
  getEpisode: animesail.getEpisode,
};
