const { playwrightGet } = require('./src/shared/scrapers/_playwright');
const cheerio = require('cheerio');

(async () => {
  const html = await playwrightGet('https://v1.animasu.app/populer/');
  const $ = cheerio.load(html);
  const links = [];
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const text = $(a).text().trim();
    if (/genre|genres|character|schedule|jadwal|animelist|anime-list|list|movie|donghua|ongoing|completed/i.test(href) || /Jadwal|Genre|Character|List|Movie|Ongoing|Completed/i.test(text)) {
      links.push({ href, text });
    }
  });
  const uniq = [];
  const seen = new Set();
  for (const item of links) {
    if (seen.has(item.href)) continue;
    seen.add(item.href);
    uniq.push(item);
  }
  console.log('title=' + $('title').text().trim());
  console.log('links=' + uniq.length);
  console.log(JSON.stringify(uniq.slice(0, 80), null, 2));
})();
