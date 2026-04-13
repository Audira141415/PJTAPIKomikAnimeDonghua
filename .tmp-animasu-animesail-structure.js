const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const targets = [
    'https://v1.animasu.app/',
    'https://v1.animasu.app/anime/one-piece-sub-indonesia/',
    'https://v1.animasu.app/nonton-one-piece-episode-1148/',
    'https://animesail.com/',
    'https://animesail.com/?s=naruto'
  ];

  for (const url of targets) {
    try {
      const html = await playwrightGet(url, { timeout: 45000 });
      const $ = cheerio.load(html);
      console.log('\nURL=' + url);
      console.log('title=' + $('title').text().trim());
      console.log('cards=' + $('article.bs, .listupd article.bs').length + ', posts=' + $('a[href*="subtitle-indonesia"]').length + ', animeLinks=' + $('a[href*="/anime/"]').length);
      console.log('spe=' + $('.spe span, .info p').length + ', epl=' + $('.eplister li').length + ', iframe=' + $('iframe').length);
    } catch (e) {
      console.log('\nURL=' + url + ' ERR=' + e.message);
    }
  }
})();
