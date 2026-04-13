const axios = require('axios');

(async () => {
  const urls = [
    'https://v1.animasu.app/',
    'https://v1.animasu.app/populer/',
    'https://v1.animasu.app/movie/',
    'https://v1.animasu.app/ongoing/',
    'https://v1.animasu.app/completed/',
    'https://v1.animasu.app/latest/',
    'https://v1.animasu.app/genre/',
    'https://v1.animasu.app/genres/aksi/',
    'https://v1.animasu.app/character/',
    'https://v1.animasu.app/character/berjuang/',
    'https://v1.animasu.app/schedule/',
    'https://v1.animasu.app/jadwal-rilis/',
    'https://v1.animasu.app/animelist/',
    'https://v1.animasu.app/anime-list/',
    'https://v1.animasu.app/?s=one+piece'
  ];
  for (const url of urls) {
    try {
      const r = await axios.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' }, validateStatus: () => true });
      const html = String(r.data || '');
      const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [,''])[1].trim();
      console.log(url + ' | ' + r.status + ' | ' + title);
    } catch (e) {
      console.log(url + ' | ERR | ' + (e.response?.status || e.code || e.message));
    }
  }
})();
