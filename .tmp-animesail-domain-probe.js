const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const candidates = [
    'https://animesail.com',
    'https://animesail.net',
    'https://animesail.cc',
    'https://animesail.site',
    'https://animesail.id',
    'https://animesail.xyz',
    'https://animesail.my.id',
    'https://animesail.web.id',
    'https://animesail.fun',
    'https://animesail.live'
  ];

  for (const url of candidates) {
    try {
      const html = await playwrightGet(url, { timeout: 20000 });
      const $ = cheerio.load(html);
      const title = $('title').text().trim();
      const postLinks = $('a[href*="subtitle-indonesia"]').length;
      const animeLinks = $('a[href*="/anime/"]').length;
      console.log(url + ' | OK | ' + title.slice(0,80) + ' | post=' + postLinks + ' anime=' + animeLinks);
    } catch (e) {
      console.log(url + ' | ERR | ' + e.message);
    }
  }
})();
