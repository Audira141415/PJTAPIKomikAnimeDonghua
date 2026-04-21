/**
 * @purpose: Automated Remote Sync & Restart for Production Node (158)
 * @caller: Manual execution (dev admin)
 * @dependencies: ssh2, GitHub origin main
 * @main_logic: git pull origin main && docker compose restart
 * @side_effects: Shuts down and restarts all containers on 192.168.100.158
 */
const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  // Folder on server is named 'audira-api' instead of the full repo name
  const repoPath = '/home/audira/audira-api';
  
  console.log(`Executing git pull in ${repoPath}`);
  conn.exec(`cd ${repoPath} && git pull origin main && docker compose restart`, (err2, stream2) => {
     if (err2) throw err2;
     stream2.on('close', () => {
       console.log('Server update complete.');
       conn.end();
     }).on('data', (data) => process.stdout.write(data)).stderr.on('data', (data) => process.stderr.write(data));
  });
}).on('error', (err) => {
   console.log('Connection error:', err.message);
}).connect({
  host: '192.168.100.158',
  port: 22,
  username: 'audira',
  password: 'Sigma1993',
  algorithms: {
    serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ssh-ed25519']
  }
});
