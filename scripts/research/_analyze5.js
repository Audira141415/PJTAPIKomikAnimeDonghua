'use strict';
const fs = require('fs');
const cheerio = require('cheerio');

function analyze(filename, name) {
  const data = fs.readFileSync('scripts/_html_' + filename + '.html', 'utf-8');
  const $ = cheerio.load(data);
  console.log('\n=== ' + name + ' ===');
  console.log('animepost:', $('.animepost').length, ' | bsx:', $('.bsx').length, ' | listupd:', $('.listupd').length);
  const first = $('.animepost').first();
  if (first.length) {
    console.log('First .animepost HTML:\n', $.html(first).slice(0, 600));
  } else {
    // Fall back to any child of listupd
    const child = $('.listupd').children().first();
    console.log('listupd first child HTML:\n', $.html(child).slice(0, 600));
  }
}

function analyzeDetail(filename, name) {
  const data = fs.readFileSync('scripts/_html_' + filename + '.html', 'utf-8');
  const $ = cheerio.load(data);
  console.log('\n=== ' + name + ' DETAIL ===');
  console.log('.thumb img:', $('.thumb img').attr('src') || 'none');
  console.log('.infomanga / .info-content:', $('.infomanga').length, $('.info-content').length);
  // Synopsis
  const synop = $('[itemprop=description], .entry-content, .sinopsis, p.description').first().text().trim().slice(0, 200);
  console.log('Synopsis snippet:', synop);
  // Chapters
  const chaps = $('#chapterlist li').length || $('.listeps li').length;
  console.log('Chapter count:', chaps);
  const firstChap = $('#chapterlist li a').first();
  if (firstChap.length) {
    console.log('First chapter href:', firstChap.attr('href'), ' | text:', firstChap.text().trim());
  }
}

analyze('bacakomik-list', 'BacaKomik LIST');
analyzeDetail('bacakomik-detail', 'BacaKomik');
analyze('mangasusuku-home', 'Mangasusuku HOME');
analyzeDetail('komikindo-detail', 'Komikindo');
