const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const html = await playwrightGet('https://v1.animasu.app/nonton-one-piece-episode-1148/');
  const $ = cheerio.load(html);
  console.log('title=' + $('title').text().trim());
  console.log('iframes=' + $('iframe').length);
  const streams = [];
  $('iframe').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src) streams.push(src);
  });
  const dls = [];
  $('a[href]').each((_, a) => {
    const h = $(a).attr('href') || '';
    const t = $(a).text().trim();
    if (!h || h === '#') return;
    if (/yourupload|vidhide|mega|blogger\.com\/video|filedon|dood|mp4|m3u8|gofile|pixeldrain|stream/i.test(h)) dls.push({ t, h });
  });
  console.log('stream_count=' + streams.length);
  console.log(JSON.stringify(streams.slice(0,8), null, 2));
  console.log('dl_count=' + dls.length);
  console.log(JSON.stringify(dls.slice(0,12), null, 2));
})();
