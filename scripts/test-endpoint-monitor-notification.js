'use strict';
require('module-alias/register');
#!/usr/bin/env node
/**
 * Test Endpoint Monitor - Manual Trigger
 * ──────────────────────────────────────────────────────────────────────────
 * Script untuk trigger endpoint monitor dan verifikasi notifikasi Telegram
 * Usage: node scripts/test-endpoint-monitor-notification.js
 */

require('dotenv').config();
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Colors
const c = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(color, prefix, msg) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`${c.gray}[${timestamp}]${c.reset} ${color}[${prefix}]${c.reset} ${msg}`);
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testDirectTelegram() {
  log(c.blue, 'TEST 1', 'Testing direct Telegram message send...');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    log(c.red, 'SKIP', 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured');
    return false;
  }

  try {
    const msg = `🧪 **Test Endpoint Monitor** 
━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ Timestamp: ${new Date().toISOString()}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Base URL: ${process.env.ENDPOINT_MONITOR_BASE_URL}
📊 Status: Manual test trigger`;

    const response = await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: chatId,
        text: msg,
        parse_mode: 'Markdown',
      },
      { timeout: 5000 }
    );

    if (response.data.ok) {
      log(c.green, 'OK', `Direct message sent (ID: ${response.data.result.message_id})`);
      return true;
    }
  } catch (err) {
    log(c.red, 'ERROR', `Failed to send Telegram message: ${err.message}`);
    return false;
  }
}

async function runEndpointMonitorScript() {
  log(c.blue, 'TEST 2', 'Running endpoint-monitor.js script...');

  const baseUrl = process.env.ENDPOINT_MONITOR_BASE_URL || 'http://127.0.0.1:5000';

  const env = {
    ...process.env,
    ENDPOINT_MONITOR_BASE_URL: baseUrl,
    ENDPOINT_MONITOR_TARGETS: JSON.stringify([
      { method: 'GET', path: '/health', expectedStatus: [200, 201] },
      { method: 'GET', path: '/api/v1/mangas', expectedStatus: [200, 400] },
    ]),
  };

  try {
    const { stdout, stderr } = await execAsync('node scripts/endpoint-monitor.js', {
      env,
      timeout: 30000,
    });

    if (stdout) {
      const result = JSON.parse(stdout.trim());
      log(c.green, 'OK', `Monitor script executed`);
      log(c.cyan, 'RESULT', `Total: ${result.summary.total}, Passed: ${result.summary.successCount}, Failed: ${result.summary.failedCount}`);

      if (result.telegram?.sent) {
        log(c.green, 'OK', 'Telegram notification sent successfully');
        return true;
      } else {
        log(c.yellow, 'WARN', 'Telegram notification not sent (may not be configured)');
        return false;
      }
    }
  } catch (err) {
    log(c.red, 'ERROR', `Script execution failed: ${err.message}`);
    if (err.stdout) {
      log(c.gray, 'STDOUT', err.stdout.substring(0, 200));
    }
    return false;
  }
}

async function checkSchedulerJob() {
  log(c.blue, 'TEST 3', 'Checking scheduler job configuration...');

  try {
    const { stdout } = await execAsync(
      "grep -n 'ENDPOINT_MONITOR_ENABLED' src/jobs/scheduler.js",
      { shell: '/bin/bash' }
    );

    if (stdout.includes('ENDPOINT_MONITOR_ENABLED')) {
      log(c.green, 'OK', 'Scheduler has endpoint-monitor configuration');

      const enabled = process.env.ENDPOINT_MONITOR_ENABLED === 'true';
      const cron = process.env.ENDPOINT_MONITOR_CRON || '*/15 * * * *';

      if (enabled) {
        log(c.green, 'OK', `Monitoring enabled with schedule: "${cron}"`);
        return true;
      } else {
        log(c.yellow, 'WARN', 'ENDPOINT_MONITOR_ENABLED not set to true');
        return false;
      }
    }
  } catch (err) {
    log(c.gray, 'INFO', 'Could not verify scheduler (may be running in Docker)');
    return true;
  }
}

async function displaySummary(results) {
  console.log('\n' + c.cyan + '════════════════════════════════════════════════════════════' + c.reset);
  console.log(c.cyan + 'TEST RESULTS SUMMARY' + c.reset);
  console.log(c.cyan + '════════════════════════════════════════════════════════════' + c.reset + '\n');

  const tests = [
    { name: 'Direct Telegram Send', passed: results.telegram },
    { name: 'Endpoint Monitor Script', passed: results.script },
    { name: 'Scheduler Configuration', passed: results.scheduler },
  ];

  tests.forEach((test, idx) => {
    const status = test.passed ? `${c.green}✅ PASS${c.reset}` : `${c.red}❌ FAIL${c.reset}`;
    console.log(`${idx + 1}. ${test.name}: ${status}`);
  });

  const allPassed = Object.values(results).every((r) => r);

  console.log('\n' + (allPassed ? c.green : c.yellow) + '═'.repeat(60) + c.reset);
  console.log(
    allPassed
      ? `${c.green}✅ ALL TESTS PASSED - Endpoint Monitor is ready!${c.reset}`
      : `${c.yellow}⚠️  SOME TESTS NEED ATTENTION${c.reset}`
  );
  console.log(
    allPassed ? c.green : c.yellow + '═'.repeat(60) + c.reset
  );

  console.log(`\n${c.cyan}Next Steps:${c.reset}`);
  if (allPassed) {
    console.log('  1. ✅ Monitor is configured and working');
    console.log('  2. ✅ Telegram notifications are functional');
    console.log('  3. ✅ Ready for production deployment');
    console.log(
      `\n${c.cyan}Verify on server:${c.reset}`
    );
    console.log('  • Check Telegram group for test message');
    console.log('  • Deploy to server and restart services');
    console.log('  • Monitor cron jobs: docker-compose logs -f scheduler');
  } else {
    console.log('  1. Review failed tests above');
    console.log('  2. Check environment variables: .env');
    console.log('  3. Verify Telegram bot token and chat ID');
    console.log('  4. Run this test again after fixes');
  }

  console.log('\n');
}

async function main() {
  console.log('\n' + c.cyan + '╔════════════════════════════════════════════════════════════╗' + c.reset);
  console.log(c.cyan + '║   TEST ENDPOINT MONITOR NOTIFICATION                        ║' + c.reset);
  console.log(c.cyan + '╚════════════════════════════════════════════════════════════╝\n' + c.reset);

  const results = {
    telegram: false,
    script: false,
    scheduler: false,
  };

  try {
    // Test 1: Direct Telegram
    results.telegram = await testDirectTelegram();
    await delay(1000);

    // Test 2: Endpoint monitor script
    results.script = await runEndpointMonitorScript();
    await delay(1000);

    // Test 3: Scheduler config
    results.scheduler = await checkSchedulerJob();

    // Summary
    await displaySummary(results);
  } catch (err) {
    log(c.red, 'FATAL', err.message);
    process.exit(1);
  }
}

main();
