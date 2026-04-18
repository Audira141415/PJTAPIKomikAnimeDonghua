'use strict';

/**
 * Meganei Scraper Service
 * Source: https://meganei.net  (WordPress REST API — JSON, NOT HTML scraping)
 * WP REST endpoint: /wp-json/wp/v2/posts
 *
 * Endpoints:
 *   home     GET /comic/meganei/home
 *   hot      GET /comic/meganei/hot
 *   latest   GET /comic/meganei/latest?page=
 *   genres   GET /comic/meganei/genres
 *   genre    GET /comic/meganei/genre/:slug?page=
 *   search   GET /comic/meganei/search?q=&page=
 *   detail   GET /comic/meganei/detail/:slug
 *   chapter  GET /comic/meganei/chapter/:slug
 */

const axios = require('axios');

const BASE_URL = 'https://meganei.net';
const WP_API  = `${BASE_URL}/wp-json/wp/v2`;

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    Accept: 'application/json, */*',
    'Accept-Language': 'id-ID,id;q=0.9',
    Referer: `${BASE_URL}/`,
  },
});

const wpGet = async (path, params = {}) => {
  const { data } = await http.get(`/wp-json/wp/v2${path}`, { params });
  return data;
};

/* Meganei custom API (aggregated via sankavollerei pattern) */
const apiGet = async (path, params = {}) => {
  const { data } = await http.get(path, { params });
  return data;
};

const home = async () => {
  /* Meganei likely exposes /api/home or similar, fall back to WP posts */
  try {
    return await apiGet('/api/home');
  } catch {
    const posts = await wpGet('/posts', { per_page: 20, page: 1 });
    return { home: posts };
  }
};

const hot = async () => {
  try {
    return await apiGet('/api/hot');
  } catch {
    const posts = await wpGet('/posts', { per_page: 12, orderby: 'comment_count' });
    return { hot: posts };
  }
};

const latest = async (page = 1) => {
  try {
    return await apiGet('/api/latest', { page });
  } catch {
    const posts = await wpGet('/posts', { per_page: 20, page });
    return { latest: posts, pagination: { currentPage: +page } };
  }
};

const genres = async () => {
  const cats = await wpGet('/categories', { per_page: 100 });
  return {
    genres: cats.map(c => ({
      id: c.id,
      title: c.name,
      slug: c.slug,
      count: c.count,
    })),
  };
};

const genre = async (slug, page = 1) => {
  /* Look up category ID from slug first */
  const [cat] = await wpGet('/categories', { per_page: 1, slug });
  if (!cat) return { genre: slug, posts: [] };
  const posts = await wpGet('/posts', { per_page: 20, page, categories: cat.id });
  return { genre: slug, posts, pagination: { currentPage: +page } };
};

const search = async (q, page = 1) => {
  try {
    return await apiGet('/api/search', { q, page });
  } catch {
    const posts = await wpGet('/posts', { per_page: 20, page, search: q });
    return { query: q, posts, pagination: { currentPage: +page } };
  }
};

const detail = async (slug) => {
  try {
    return await apiGet(`/api/detail/${slug}`);
  } catch {
    const [post] = await wpGet('/posts', { per_page: 1, slug });
    return { detail: post || null };
  }
};

const chapter = async (slug) => {
  try {
    return await apiGet(`/api/chapter/${slug}`);
  } catch {
    /* Try getting chapter as page */
    const [page] = await wpGet('/pages', { per_page: 1, slug });
    return { chapter: page || null };
  }
};

module.exports = { home, hot, latest, genres, genre, search, detail, chapter };
