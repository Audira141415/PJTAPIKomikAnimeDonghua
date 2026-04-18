'use strict';

/**
 * Axios instance pre-configured for the Sanka Vollerei anime proxy API.
 * Base URL: https://www.sankavollerei.com/anime
 * Rate limit: 50 req/min — use responsibly.
 */

const axios = require('axios');

const sankaClient = axios.create({
  baseURL: 'https://www.sankavollerei.com/anime',
  timeout: 20000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  },
});

/**
 * Fetch a resource from the Sanka API and return the `data` payload.
 * @param {string}  path    - e.g. '/samehadaku/home'
 * @param {object}  [params]- query-string params object
 * @returns {Promise<*>}    - `response.data.data` from the API
 */
const sankaGet = async (path, params = {}) => {
  const res = await sankaClient.get(path, { params });
  return res.data;
};

module.exports = { sankaClient, sankaGet };
