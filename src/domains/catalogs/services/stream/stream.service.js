'use strict';

const stream = require('@scrapers/stream.scraper');

const getLatest  = (page = 1)      => stream.getLatest(page);
const getPopular = ()               => stream.getPopular();
const search     = (query)          => stream.search(query);
const getAnime   = (slug)           => stream.getAnime(slug);
const getEpisode = (slug)           => stream.getEpisode(slug);
const getMovies  = (page = 1)       => stream.getMovies(page);
const getList    = ()               => stream.getList();
const getGenres  = ()               => stream.getGenres();
const getByGenre = (slug, page = 1) => stream.getByGenre(slug, page);

module.exports = { getLatest, getPopular, search, getAnime, getEpisode, getMovies, getList, getGenres, getByGenre };
