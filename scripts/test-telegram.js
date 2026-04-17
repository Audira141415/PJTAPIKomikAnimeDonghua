'use strict';

require('dotenv').config();
const telegram = require('../src/shared/utils/telegram');

async function test() {
  console.log('--- TESTING TELEGRAM NOTIFICATION ---');
  
  await telegram.sendAlert(
    'Audira Bot Test',
    '🎉 <b>Halo Admin!</b>\n\nNotifikasi sistem Audira telah berhasil diaktifkan dengan format baru.\n\nSistem sekarang siap memantau Scraper, Mirroring Image, dan Kesehatan Server Anda secara 24/7.',
    'success'
  );
  
  console.log('--- TEST FINISHED ---');
  process.exit(0);
}

test().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
