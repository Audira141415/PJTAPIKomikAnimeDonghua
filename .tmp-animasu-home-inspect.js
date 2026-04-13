const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const html = await playwrightGet('https://v1.animasu.app/');
  const $ = cheerio.load(html);
  console.log('title=' + $('title').text().trim());
  const sels = ['.post','.entry','.item','.anime','.anime-item','.list','.grid','.movie-item','.bsx','.post-show','.thumb'];
  console.log('counts=' + sels.map((s) => s + ':' + $(s).length).join(' | '));
  const anchors = [];
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const text = $(a).text().trim().replace(/\s+/g,' ');
    if (/nonton-|\/anime\//i.test(href)) anchors.push({ href, text });
  });
  const uniq = [];
  const seen = new Set();
  for (const x of anchors) {
    if (seen.has(x.href)) continue;
    seen.add(x.href);
    uniq.push(x);
  }
  console.log('anchor_count=' + uniq.length);
  console.log(JSON.stringify(uniq.slice(0, 30), null, 2));
})();
