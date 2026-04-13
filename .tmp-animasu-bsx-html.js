const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const html = await playwrightGet('https://v1.animasu.app/populer/');
  const $ = cheerio.load(html);
  const first = $('.bsx').first();
  console.log('first_bsx=' + (first.html() || '').slice(0, 1200));
})();
