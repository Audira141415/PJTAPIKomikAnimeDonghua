const axios = require('axios');
const { playwrightGet } = require('./src/shared/scrapers/_playwright');

(async () => {
  const url = 'https://animesail.com/anime/one-piece/';
  try {
    const r = await axios.get(url, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const h = String(r.data || '');
    console.log('axios_len=' + h.length);
    console.log(h.slice(0, 700));
    console.log('axios_contains_loading=' + h.includes('Loading..'));
    console.log('axios_contains_cf=' + (h.includes('Cloudflare') || h.includes('Just a moment')));
  } catch (e) {
    console.log('axios_err=' + (e.response?.status || e.message));
  }

  try {
    const hp = await playwrightGet(url, { timeout: 45000 });
    console.log('pw_len=' + hp.length);
    console.log(hp.slice(0, 700));
    console.log('pw_contains_loading=' + hp.includes('Loading..'));
    console.log('pw_contains_cf=' + (hp.includes('Cloudflare') || hp.includes('Just a moment')));
  } catch (e) {
    console.log('pw_err=' + e.message);
  }
})();
