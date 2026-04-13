const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const html = await playwrightGet('https://v1.animasu.app/anime/op-indonesia/');
  const $ = cheerio.load(html);
  console.log('title=' + $('title').text().trim());
  console.log('spe=' + $('.spe span, .info p').length + ', ifr=' + $('iframe').length + ', episodes=' + $('a[href*="/nonton-"]').length);
  console.log('h1=' + $('h1.entry-title,h1').first().text().trim());
  const eps = [];
  $('a[href*="/nonton-"]').each((_,a)=>{const h=$(a).attr('href')||''; const t=$(a).text().trim(); if(h&&t) eps.push({h,t});});
  console.log(JSON.stringify(eps.slice(0,8),null,2));
})();
