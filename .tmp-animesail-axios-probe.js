const axios = require('axios');

(async () => {
  const candidates = [
    'https://animesail.com',
    'https://animesail.net',
    'https://animesail.cc',
    'https://animesail.site',
    'https://animesail.id',
    'https://animesail.xyz',
    'https://animesail.my.id'
  ];

  for (const url of candidates) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      const html = String(response.data || '');
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'no-title';
      console.log(url + ' | ' + response.status + ' | ' + title.slice(0, 80));
    } catch (error) {
      console.log(url + ' | ERR | ' + (error.response?.status || error.code || error.message));
    }
  }
})();
