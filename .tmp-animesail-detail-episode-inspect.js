const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const urls = [
    'https://animesail.com/anime/one-piece/',
    'https://animesail.com/anime/akujiki-reijou-to-kyouketsu-koushaku/',
    'https://animesail.com/akujiki-reijou-to-kyouketsu-koushaku-episode-11-subtitle-indonesia/'
  ];
  for (const url of urls) {
    try {
      const html = await playwrightGet(url, { timeout: 45000 });
      const $ = cheerio.load(html);
      console.log('\nURL=' + url);
      console.log('title=' + $('title').text().trim());
      console.log('bsx=' + $('.bsx').length + ', epl=' + $('.eplister li, a[href*="episode"]').length + ', iframe=' + $('iframe').length + ', info=' + $('.spe span, .info p').length);
      const links=[];
      $('a[href]').each((_,a)=>{const h=$(a).attr('href')||''; const t=$(a).text().trim(); if(/episode|anime|genres|season|studio|subtitle|movie|download|drive|pixeldrain/i.test(h)||/Episode|Download/i.test(t)) links.push({h,t});});
      const uniq=[]; const seen=new Set(); for(const x of links){if(seen.has(x.h)) continue; seen.add(x.h); uniq.push(x);} 
      console.log('links='+uniq.length);
      console.log(JSON.stringify(uniq.slice(0,18),null,2));
    } catch (e) {
      console.log('\nURL=' + url + ' ERR=' + e.message);
    }
  }
})();
