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

async function dumpPage(url, name, saveHtml) {
  try {
    const { data } = await http.get(url);
    const $ = cheerio.load(data);
    console.log('\n=== ' + name + ' ===');
    console.log('Title:', $('title').text().trim().slice(0, 80));
    
    // Print all unique class names from elements containing "manga" or "komik" or "list"
    const classes = new Set();
    $('*').each(function() {
      const cls = $(this).attr('class') || '';
      if (cls) cls.split(/\s+/).forEach(c => c && classes.add(c));
    });
    const relevant = [...classes].filter(c => 
      /(list|card|item|manga|komik|post|comic|thumb|cover|chap|update|grid)/i.test(c)
    ).slice(0, 40);
    console.log('Relevant classes:', relevant.join(', '));
    
    // Full HTML of first list-type element
    if (saveHtml) {
      const fs = require('fs');
      fs.writeFileSync('scripts/_html_' + name + '.html', String(data).slice(0, 50000));
      console.log('Saved HTML to scripts/_html_' + name + '.html');
    }
  } catch (e) {
    console.log('FAIL ' + name + ': ' + e.message);
  }
}

async function main() {
  await dumpPage('https://bacakomik.my/daftar-komik/', 'bacakomik-list', true);
  await dumpPage('https://bacakomik.my/manga/nano-machine/', 'bacakomik-detail', true);
  await dumpPage('https://komikindo.ch/daftar-komik/', 'komikindo-list', true);
  await dumpPage('https://komikindo.ch/komik/nano-machine/', 'komikindo-detail', true);
  await dumpPage('https://mangasusuku.com/', 'mangasusuku-home', true);
  await dumpPage('https://mangasusuku.com/komik/nano-machine/', 'mangasusuku-detail', true);
  console.log('\nDone');
}

main().catch(console.error);
