const axios = require('axios');
axios.get('https://api.mangadex.org/ping')
  .then(r => console.log('Ping OK: ' + r.status))
  .catch(e => {
    console.error('Ping FAILED');
    console.error('Message:', e.message);
    if (e.response) {
      console.error('Status:', e.response.status);
      console.error('Data:', JSON.stringify(e.response.data).slice(0, 100));
    }
    if (e.code) console.error('Code:', e.code);
  });
