const axios = require('axios');

(async () => {
  const urls = [
    'https://animesail.com/anime/',
    'https://animesail.com/movie-terbaru/',
    'https://animesail.com/jadwal-tayang/',
    'https://animesail.com/genre/',
    'https://animesail.com/genres/action/',
    'https://animesail.com/season/fall-2025/',
    'https://animesail.com/studio/mappa/',
    'https://animesail.com/?s=one+piece',
    'https://animesail.com/?s=naruto'
  ];

  for (const url of urls) {
    try {
      const r = await axios.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' }, validateStatus: () => true });
      const html = String(r.data || '');
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [,''])[1].trim();
      console.log(url + ' | ' + r.status + ' | title=' + title);
    } catch (e) {
      console.log(url + ' | ERR | ' + (e.response?.status || e.code || e.message));
    }
  }
})();
