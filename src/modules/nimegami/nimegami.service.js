'use strict';

const nimegami = require('../../shared/scrapers/nimegami.scraper');

const getHome      = ({ page = 1 } = {}) => nimegami.getHome({ page });
const search       = (query, { page = 1 } = {}) => nimegami.search(query, { page });
const getDetail    = (slug) => nimegami.getDetail(slug);
const getAnimeList = ({ page = 1 } = {}) => nimegami.getAnimeList({ page });
const getGenreList = () => nimegami.getGenreList();
const getByGenre   = (slug) => nimegami.getByGenre(slug);
const getSeasonList= () => nimegami.getSeasonList();
const getBySeason  = (slug) => nimegami.getBySeason(slug);
const getTypeList  = () => nimegami.getTypeList();
const getByType    = (slug) => nimegami.getByType(slug);
const getJDrama    = () => nimegami.getJDrama();
const getLiveAction= () => nimegami.getLiveAction();
const getLiveDetail= (slug) => nimegami.getLiveDetail(slug);
const getDrama     = (slug) => nimegami.getDrama(slug);

module.exports = { getHome, search, getDetail, getAnimeList, getGenreList, getByGenre, getSeasonList, getBySeason, getTypeList, getByType, getJDrama, getLiveAction, getLiveDetail, getDrama };
