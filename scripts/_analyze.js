'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

const http = axios.create({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
  }
});

async function fetchAndAnalyze(url, name) {
  try {
    const { data } = await http.get(url);
    const $ = cheerio.load(data);
    const cards = [];
    const selectors = ['.bsx', '.bs', '.animpost', '.listupd .bs', '.utao', '.manga-item', 'article.item', '.soralist li', '.page-listing-item', '.list-update_item'];
    selectors.forEach(function(s) {
      const count = $(s).length;
      if (count > 0) cards.push({ selector: s, count });
    });
    console.log('\n=== ' + name + ' (' + url + ') ===');
    console.log('Card selectors found:', JSON.stringify(cards));
    if (cards.length > 0) {
      const firstEl = $(cards[0].selector).first();
      console.log('First card HTML (600 chars):', $.html(firstEl).slice(0, 600));
    }
    // Also check for title/image/link elements
    const titleEl = $('h1, h2, h3').first().text().trim().slice(0, 100);
    console.log('Page title area:', titleEl);
  } catch (e) {
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

async function main() {
  // Get more source details from sankavollerei to understand response format
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
  console.log('\nDone');
}

main().catch(console.error);
