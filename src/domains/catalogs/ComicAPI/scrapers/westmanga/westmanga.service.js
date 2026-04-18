'use strict';

/**
 * Westmanga Scraper Service
 * Source: https://data.westmanga.tv  (JSON REST API — NOT HTML scraping)
 * Method: Direct JSON API calls
 *
 * Endpoints:
 *   home         GET /comic/westmanga/home
 *   genres       GET /comic/westmanga/genres
 *   list         GET /comic/westmanga/list
 *   latest       GET /comic/westmanga/latest?page=
 *   popular      GET /comic/westmanga/popular?page=
 *   ongoing      GET /comic/westmanga/ongoing?page=
 *   completed    GET /comic/westmanga/completed?page=
 *   manga        GET /comic/westmanga/manga?page=
 *   manhua       GET /comic/westmanga/manhua?page=
 *   manhwa       GET /comic/westmanga/manhwa?page=
 *   az           GET /comic/westmanga/az?page=
 *   za           GET /comic/westmanga/za?page=
 *   added        GET /comic/westmanga/added?page=
 *   colored      GET /comic/westmanga/colored?page=
 *   projects     GET /comic/westmanga/projects?page=
 *   genre        GET /comic/westmanga/genre/:id?page=
 *   search       GET /comic/westmanga/search?q=&page=
 *   detail       GET /comic/westmanga/detail/:slug
 *   chapter      GET /comic/westmanga/chapter/:slug
 */

const axios = require('axios');

const BASE_URL = 'https://data.westmanga.tv';

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/json, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    Referer: 'https://westmanga.tv/',
    Origin: 'https://westmanga.tv',
  },
});

const get = async (path, params = {}) => {
  const { data } = await http.get(path, { params });
  return data;
};

/* -- List API -- */
const listContents = (page = 1, extra = {}) =>
  get('/api/contents', { page, ...extra });

const home = () => listContents(1, { orderBy: 'Update' });

const latest   = (page = 1) => listContents(page, { orderBy: 'Update' });
const popular  = (page = 1) => listContents(page, { orderBy: 'Popular' });
const ongoing  = (page = 1) => listContents(page, { status: 'Ongoing' });
const completed = (page = 1) => listContents(page, { status: 'Completed' });
const manga    = (page = 1) => listContents(page, { type: 'Manga' });
const manhua   = (page = 1) => listContents(page, { type: 'Manhua' });
const manhwa   = (page = 1) => listContents(page, { type: 'Manhwa' });
const az       = (page = 1) => listContents(page, { orderBy: 'Az' });
const za       = (page = 1) => listContents(page, { orderBy: 'Za' });
const added    = (page = 1) => listContents(page, { orderBy: 'Added' });
const colored  = (page = 1) => listContents(page, { colored: true });
const projects = (page = 1) => listContents(page, { isProject: true });

const list = (page = 1) => listContents(page, { orderBy: 'Az' });

const genres = () => get('/api/genres');

const genre = (id, page = 1) => get('/api/contents', { page, genre: id });

const search = (q, page = 1) => get('/api/contents', { page, q });

const detail = (slug) => get(`/api/contents/${slug}`);

const chapter = (slug) => get(`/api/chapters/${slug}`);

module.exports = {
  home, genres, list,
  latest, popular, ongoing, completed,
  manga, manhua, manhwa,
  az, za, added, colored, projects,
  genre, search, detail, chapter,
};
