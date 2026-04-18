'use strict';
require('module-alias/register');

require('dotenv').config();
const shield = require('@core/utils/shield');
const mongoose = require('mongoose');

async function runTest() {
  console.log('--- AUDIRA SHIELD TEST ---');
  
  const testIP = '1.2.3.4';
  
  // 1. Initial State
  const bannedBefore = await shield.isBanned(testIP);
  console.log(`[Test] IP ${testIP} banned initially: ${bannedBefore}`);

  // 2. Add suspicion points
  console.log(`[Test] Adding 10 points to ${testIP}...`);
  await shield.addSuspicionPoints(testIP, 10, 'Test suspicion');
  
  const bannedAfter10 = await shield.isBanned(testIP);
  console.log(`[Test] IP ${testIP} banned after 10 points: ${bannedAfter10}`);

  // 3. Trigger threshold (Threshold is 20)
  console.log(`[Test] Adding another 15 points to ${testIP}...`);
  await shield.addSuspicionPoints(testIP, 15, 'Test threshold trigger');

  const bannedFinal = await shield.isBanned(testIP);
  console.log(`[Test] IP ${testIP} banned after total 25 points: ${bannedFinal}`);

  if (bannedFinal) {
    console.log('✅ SHIELD TEST PASSED: IP banned successfully.');
  } else {
    console.error('❌ SHIELD TEST FAILED: IP was not banned.');
  }

  process.exit(bannedFinal ? 0 : 1);
}

runTest().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
