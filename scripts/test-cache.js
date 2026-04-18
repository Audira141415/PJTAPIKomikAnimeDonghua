'use strict';
require('module-alias/register');

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

async function runTest() {
  console.log('--- REDIS CACHE TEST ---');
  
  const targetUrl = `${BASE_URL}/api/v1/comic/latest`;
  console.log(`[Test] Target: ${targetUrl}`);

  try {
    // 1. First Request (Should be MISS)
    console.log('[Test] Request 1 (Expecting MISS)...');
    const start1 = Date.now();
    const res1 = await axios.get(targetUrl, { headers: { 'Cache-Control': 'no-cache' } }); // Force bypass for first time to ensure clean state or just normal
    // Wait, better just normal request.
    const res1_actual = await axios.get(targetUrl);
    const duration1 = Date.now() - start1;
    console.log(`[Test] Response 1: X-Cache=${res1_actual.headers['x-cache']}, Time=${duration1}ms`);

    // 2. Second Request (Should be HIT)
    console.log('[Test] Request 2 (Expecting HIT)...');
    const start2 = Date.now();
    const res2 = await axios.get(targetUrl);
    const duration2 = Date.now() - start2;
    console.log(`[Test] Response 2: X-Cache=${res2.headers['x-cache']}, Time=${duration2}ms`);

    if (res2.headers['x-cache'] === 'HIT') {
      console.log('✅ CACHE TEST PASSED: Response served from Redis Cache.');
    } else {
      console.error('❌ CACHE TEST FAILED: Response was not cached.');
    }

    process.exit(res2.headers['x-cache'] === 'HIT' ? 0 : 1);
  } catch (err) {
    console.error('Test Error:', err.message);
    process.exit(1);
  }
}

runTest();
