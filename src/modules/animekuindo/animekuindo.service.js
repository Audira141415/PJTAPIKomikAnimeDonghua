'use strict';

const animekuindo = require('../../shared/scrapers/animekuindo.scraper');

const getHome    = ({ page = 1 } = {})  => animekuindo.getHome({ page });
const getSchedule= ()                   => animekuindo.getSchedule();
const getLatest  = ({ page = 1 } = {})  => animekuindo.getLatest({ page });
const getPopular = ({ page = 1 } = {})  => animekuindo.getPopular({ page });
const getMovies  = ({ page = 1 } = {})  => animekuindo.getMovies({ page });
const search     = (query)              => animekuindo.search(query);
const getGenres  = ()                   => animekuindo.getGenres();
const getByGenre = (slug)               => animekuindo.getByGenre(slug);
const getSeasons = ()                   => animekuindo.getSeasons();
const getBySeason= (slug)               => animekuindo.getBySeason(slug);
const getDetail  = (slug)               => animekuindo.getDetail(slug);
const getEpisode = (slug)               => animekuindo.getEpisode(slug);

module.exports = { getHome, getSchedule, getLatest, getPopular, getMovies, search, getGenres, getByGenre, getSeasons, getBySeason, getDetail, getEpisode };
