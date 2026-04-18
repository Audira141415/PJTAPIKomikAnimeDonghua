'use strict';

/**
 * Anoboy Service
 * Direct scraper service (tanpa proxy Sanka).
 */

const anoboy = require('@scrapers/anoboy.scraper');

const getHome = ({ page = 1 } = {}) => anoboy.getHome({ page });
const search = (keyword, { page = 1 } = {}) => anoboy.search(keyword, { page });
const getAnime = (slug) => anoboy.getAnime(slug);
const getEpisode = (slug) => anoboy.getEpisode(slug);
const getAzList = ({ page = 1, show } = {}) => anoboy.getAzList({ page, show });
const getList = (params = {}) => anoboy.getList(params);
const getByGenre = (slug, { page = 1 } = {}) => anoboy.getByGenre(slug, { page });
const getAllGenres = () => anoboy.getAllGenres();

module.exports = { getHome, search, getAnime, getEpisode, getAzList, getList, getByGenre, getAllGenres };
