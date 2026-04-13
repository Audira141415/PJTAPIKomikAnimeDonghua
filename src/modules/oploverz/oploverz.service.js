'use strict';

const scraper = require('../../shared/scrapers/oploverz.scraper');

const getHome      = ({ page = 1 } = {})                          => scraper.getHome({ page });
const getSchedule  = ()                                           => scraper.getSchedule();
const getOngoing   = ({ page = 1 } = {})                          => scraper.getOngoing({ page });
const getCompleted = ({ page = 1 } = {})                          => scraper.getCompleted({ page });
const getList      = ({ page = 1, status, type, order } = {})     => scraper.getList({ page, status, type, order });
const search       = (query, { page = 1 } = {})                   => scraper.search(query, { page });
const getAnime     = (slug)                                       => scraper.getAnime(slug);
const getEpisode   = (slug)                                       => scraper.getEpisode(slug);

module.exports = { getHome, getSchedule, getOngoing, getCompleted, getList, search, getAnime, getEpisode };
