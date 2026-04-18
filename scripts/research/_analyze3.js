'use strict';
const axios = require('axios');
const cheerio = require('cheerio');

const http = axios.create({
  timeout: 25000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    'Referer': 'https://www.google.com/',
  }
});

async function inspectPage(url, name) {
  try {
    const { data } = await http.get(url);
    const $ = cheerio.load(data);
    const cardSelectors = ['.bsx', '.bs', '.animpost', '.listupd .bs', '.list-update_item', 
      '.utao', '.manga-item', 'article.item', '.soralist li', '.page-listing-item', 
      '.post-item', '.entry', '.loop-item', '.bixbox .bsx', '.hot-item',
      'div[class*="item"]', 'li[class*="comics"]', '.list-chapter a'];
    
    console.log('\n=== ' + name + ' (' + url + ') ===');
    console.log('Title:', $('title').text().trim().slice(0, 80));
    
    for (const sel of cardSelectors) {
      const n = $(sel).length;
      if (n > 2) {
        const first = $(sel).first();
        console.log('Found selector [' + sel + '] x' + n, ':', $.html(first).slice(0, 400));
        break;
      }
    }
    
    // Check for JSON data embedded in page
    const jsonMatch = data.match(/window\.__NEXT_DATA__\s*=\s*({.+?})\s*<\/script>/s);
    if (jsonMatch) console.log('NEXT.js data found, length:', jsonMatch[1].length);
  } catch (e) {
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

async function main() {
  await inspectPage('https://bacakomik.my/daftar-komik/', 'BacaKomik-list');
  await inspectPage('https://bacakomik.my/manga/nano-machine/', 'BacaKomik-detail');
  await inspectPage('https://mangakita.me/manga/one-piece/', 'Mangakita-detail');
  await inspectPage('https://mangakita.me/one-piece-chapter-1-bahasa-indonesia/', 'Mangakita-chapter');
  await inspectPage('https://komikindo.ch', 'Komikindo-home');
  await inspectPage('https://v2.kiryuu.to', 'Kiryuu-home');
  await inspectPage('https://mangasusuku.com', 'Mangasusuku-home');
  await inspectPage('https://meganei.net', 'Meganei-home');
  console.log('\nDone');
}

main().catch(console.error);
