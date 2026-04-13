const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const urls = [
    'https://v1.animasu.app/kumpulan-genre-anime-lengkap/',
    'https://v1.animasu.app/jadwal/',
    'https://v1.animasu.app/anime-movie/',
    'https://v1.animasu.app/genre/aksi/',
    'https://v1.animasu.app/genre/donghua/',
    'https://v1.animasu.app/animelist/'
  ];

  for (const url of urls) {
    try {
      const html = await playwrightGet(url, { timeout: 45000 });
      const $ = cheerio.load(html);
      console.log('\n' + url);
      console.log('title=' + $('title').text().trim());
      console.log('cards=' + $('.bsx, article.bs, .listupd article.bs').length + ', genreLinks=' + $('a[href*="/genre/"]').length + ', scheduleBlocks=' + $('.scheduday,.schedule-day,.daysec').length);
    } catch (e) {
      console.log('\n' + url + ' ERR=' + e.message);
    }
  }
})();
