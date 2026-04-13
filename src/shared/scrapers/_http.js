'use strict';

/**
 * Shared HTTP client factory untuk direct scraper.
 * Mirip browser — header lengkap + retry otomatis untuk 429/503.
 */

const axios = require('axios');

const BROWSER_HEADERS = {
  'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept'         : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT'            : '1',
  'Connection'     : 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control'  : 'max-age=0',
  'Sec-Fetch-Dest' : 'document',
  'Sec-Fetch-Mode' : 'navigate',
  'Sec-Fetch-Site' : 'none',
  'Sec-Fetch-User' : '?1',
};

const RETRY_ON = new Set([429, 503, 502, 504]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Buat HTTP client dengan baseURL tertentu.
 * @param {string} baseURL   - contoh: 'https://v2.samehadaku.how'
 * @param {object} [extra]   - header tambahan
 */
function createHttpClient(baseURL, extra = {}) {
  const client = axios.create({
    baseURL,
    timeout     : 20_000,
    maxRedirects: 5,
    headers     : { ...BROWSER_HEADERS, ...extra, Referer: baseURL + '/' },
  });

  /**
   * GET dengan retry eksponensial.
   * @param {string} path
   * @param {object} [opts]
   * @param {object} [opts.params]   - query string
   * @param {number} [opts.retries]  - default 3
   * @returns {Promise<string>}      - HTML string
   */
  async function get(path, { params, retries = 3 } = {}) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await client.get(path, { params });
        return res.data;
      } catch (err) {
        const status = err.response?.status;
        if (RETRY_ON.has(status) && attempt < retries) {
          const wait = attempt * 2_000 + Math.random() * 1_000;
          await sleep(wait);
          continue;
        }
        throw err;
      }
    }
  }

  return { get, baseURL };
}

module.exports = { createHttpClient };
