process.on('uncaughtException', (e) => { console.error('UNCAUGHT:', e.message); process.exit(1); });
process.on('unhandledRejection', (e) => { console.error('UNHANDLED:', e.message); process.exit(1); });
console.log('Starting...');
require('./server.js');
setTimeout(() => { console.log('Server seems OK after 3s'); process.exit(0); }, 3000);
