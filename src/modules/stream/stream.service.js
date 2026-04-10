'use strict';

const { sankaGet } = require('../../shared/utils/sankaClient');
const from = (r) => r?.data ?? r;

const getLatest  = (page = 1)                         => sankaGet(`/stream/latest/${page}`).then(from);
const getPopular = ()                                  => sankaGet('/stream/popular').then(from);
const search     = (query)                             => sankaGet(`/stream/search/${encodeURIComponent(query)}`).then(from);
const getAnime   = (slug)                              => sankaGet(`/stream/anime/${slug}`).then(from);
const getEpisode = (slug)                              => sankaGet(`/stream/episode/${slug}`).then(from);
const getMovies  = (page = 1)                          => sankaGet(`/stream/movie/${page}`).then(from);
const getList    = ()                                  => sankaGet('/stream/list').then(from);
const getGenres  = ()                                  => sankaGet('/stream/genres').then(from);
const getByGenre = (slug, page = 1)                    => sankaGet(`/stream/genres/${slug}/${page}`).then(from);

module.exports = { getLatest, getPopular, search, getAnime, getEpisode, getMovies, getList, getGenres, getByGenre };
