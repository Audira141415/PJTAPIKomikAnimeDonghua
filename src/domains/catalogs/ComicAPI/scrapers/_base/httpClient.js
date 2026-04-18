'use strict';

const axios = require('axios');

/**
 * Factory — buat axios instance untuk tiap scraper source.
 * Semua source berbagi UA + Accept headers yang sama.
 */
const createHttpClient = (baseURL, extraHeaders = {}) =>
  axios.create({
    baseURL,
    timeout: 20000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
      ...extraHeaders,
    },
  });

module.exports = { createHttpClient };
