process.env.NODE_ENV = 'production';
try {
  require('./src/app');
  console.log('APP_OK');
} catch(e) {
  console.error('APP_ERR:', e.message);
  process.exit(1);
}
