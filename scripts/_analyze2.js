'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

const http = axios.create({
  timeout: 25000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  }
});

async function fetchJson(url, name) {
  try {
    const { data } = await http.get(url, { headers: { Accept: 'application/json' } });
    console.log('\n=== ' + name + ' ===');
    console.log(JSON.stringify(data, null, 2).slice(0, 1800));
  } catch (e) {
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

async function main() {
  await fetchJson('https://www.sankavollerei.com/comic/bacakomik/detail/nano-machine', 'BacaKomik-detail');
  await fetchJson('https://www.sankavollerei.com/comic/bacakomik/chapter/nano-machine-chapter-1', 'BacaKomik-chapter');
  await fetchJson('https://www.sankavollerei.com/comic/westmanga/detail/solo-leveling', 'Westmanga-detail');
  await fetchJson('https://www.sankavollerei.com/comic/soulscan/home', 'SoulScans-home');
  await fetchJson('https://www.sankavollerei.com/comic/bacaman/home', 'Bacaman-home');
  await fetchJson('https://www.sankavollerei.com/comic/meganei/home/1', 'Meganei-home');
  await fetchJson('https://www.sankavollerei.com/comic/mangasusuku/home', 'Mangasusuku-home');
  await fetchJson('https://www.sankavollerei.com/comic/kiryuu/home', 'Kiryuu-home');
  await fetchJson('https://www.sankavollerei.com/comic/cosmic/home', 'Cosmic-home');
  await fetchJson('https://www.sankavollerei.com/comic/maid/latest', 'Maid-latest');
  await fetchJson('https://www.sankavollerei.com/comic/komikindo/latest/1', 'Komikindo-latest');
  await fetchJson('https://www.sankavollerei.com/comic/komikstation/list', 'Komikstation-list');
  await fetchJson('https://www.sankavollerei.com/comic/mangakita/detail/one-piece', 'Mangakita-detail');
  await fetchJson('https://www.sankavollerei.com/comic/mangakita/chapter/one-piece-chapter-1163-bahasa-indonesia', 'Mangakita-chapter');
  await fetchJson('https://www.sankavollerei.com/comic/softkomik/list', 'Softkomik-list');
  console.log('\nDone');
}

main().catch(console.error);
