'use strict';

const donghub = require('@scrapers/donghub.scraper');

const getHome    = ()                         => donghub.getHome();
const getLatest  = ({ page = 1 } = {})       => donghub.getLatest({ page });
const getPopular = ({ page = 1 } = {})       => donghub.getPopular({ page });
const getMovies  = ({ page = 1 } = {})       => donghub.getMovies({ page });
const getSchedule= ()                        => donghub.getSchedule();
const search     = (query)                   => donghub.search(query);
const getByGenre = (slug)                    => donghub.getByGenre(slug);
const getList    = (params = {})             => donghub.getList(params);
const getDetail  = (slug)                    => donghub.getDetail(slug);
const getEpisode = (slug)                    => donghub.getEpisode(slug);

module.exports = { getHome, getLatest, getPopular, getMovies, getSchedule, search, getByGenre, getList, getDetail, getEpisode };
