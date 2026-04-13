'use strict';

const fs = require('fs');
const path = require('path');

describe('docker-compose mongo healthcheck', () => {
  it('uses the MongoDB 4.4 shell binary for health checks', () => {
    const composePath = path.resolve(__dirname, '..', '..', 'docker-compose.yml');
    const composeText = fs.readFileSync(composePath, 'utf8');
    const expectedHealthcheck = /test: \["CMD-SHELL", "mongo --quiet --username \\\"\$\$MONGO_INITDB_ROOT_USERNAME\\\" --password \\\"\$\$MONGO_INITDB_ROOT_PASSWORD\\\" --authenticationDatabase admin localhost:27017\/admin --eval \\\"quit\(db\.adminCommand\(\{ ping: 1 \}\)\.ok \? 0 : 2\)\\\""\]/;

    expect(composeText).toContain('image: mongo:4.4');
    expect(composeText).toMatch(expectedHealthcheck);
    expect(composeText).not.toContain('test: ["CMD", "mongosh", "--eval", "db.adminCommand(\'ping\')"]');
  });

  it('overrides scheduler and worker healthchecks for non-http processes', () => {
    const composePath = path.resolve(__dirname, '..', '..', 'docker-compose.yml');
    const composeText = fs.readFileSync(composePath, 'utf8');

    expect(composeText).toContain('command: ["node", "scripts/scheduler.js"]');
    expect(composeText).toContain('command: ["node", "src/jobs/worker.js"]');
    expect(composeText).toMatch(/scheduler:[\s\S]*?healthcheck:[\s\S]*?test: \["CMD", "node", "-e", "[^"]*scripts\/scheduler\.js[^"]*"\]/);
    expect(composeText).toMatch(/worker:[\s\S]*?healthcheck:[\s\S]*?test: \["CMD", "node", "-e", "[^"]*src\/jobs\/worker\.js[^"]*"\]/);
  });
});