'use strict';
require('module-alias/register');
#!/usr/bin/env node
/**
 * Verify Endpoint Monitor Setup
 * ──────────────────────────────────────────────────────────────────────────
 * Script untuk memverifikasi konfigurasi endpoint monitor sudah benar
 * Run: NODE_ENV=production node scripts/verify-endpoint-monitor-setup.js
 */

require('dotenv').config();
const axios = require('axios');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, label, msg = '') {
  console.log(`${color}[${label}]${colors.reset} ${msg}`);
}

async function verifyTelegramConnection() {
  log(colors.blue, 'TELEGRAM', 'Verifying Telegram bot connection...');

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    log(colors.red, 'ERROR', 'TELEGRAM_BOT_TOKEN is not set');
    return false;
  }

  if (!chatId) {
    log(colors.red, 'ERROR', 'TELEGRAM_CHAT_ID is not set');
    return false;
  }

  try {
    const response = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
    if (response.data.ok) {
      log(colors.green, 'OK', `Telegram bot connected: @${response.data.result.username}`);
      log(colors.green, 'OK', `Chat ID configured: ${chatId}`);
      
      // Test send message
      const testMsg = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text: `✅ [Endpoint Monitor] Konfigurasi berhasil diverifikasi pada ${new Date().toISOString()}`,
        }
      );

      if (testMsg.data.ok) {
        log(colors.green, 'OK', 'Telegram test message sent successfully');
        return true;
      }
    }
  } catch (err) {
    log(colors.red, 'ERROR', `Telegram connection failed: ${err.message}`);
    return false;
  }
}

function verifyEnvironmentVariables() {
  log(colors.blue, 'CONFIG', 'Checking environment variables...');

  const required = [
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
    'ENDPOINT_MONITOR_ENABLED',
    'ENDPOINT_MONITOR_BASE_URL',
  ];

  const optional = [
    'ENDPOINT_MONITOR_CRON',
    'ENDPOINT_MONITOR_TIMEOUT_MS',
    'ENDPOINT_MONITOR_NOTIFY_ON_SUCCESS',
  ];

  let allValid = true;

  for (const key of required) {
    const value = process.env[key];
    if (!value) {
      log(colors.red, 'MISSING', `Required: ${key}`);
      allValid = false;
    } else {
      const masked = key === 'TELEGRAM_BOT_TOKEN' ? value.substring(0, 10) + '...' : value;
      log(colors.green, 'SET', `${key} = ${masked}`);
    }
  }

  console.log('');

  for (const key of optional) {
    const value = process.env[key];
    if (value) {
      log(colors.cyan, 'OPT', `${key} = ${value}`);
    }
  }

  return allValid;
}

function displaySchedulerInfo() {
  log(colors.blue, 'SCHEDULER', 'Endpoint monitor scheduling...');

  const enabled = process.env.ENDPOINT_MONITOR_ENABLED === 'true';
  const cron = process.env.ENDPOINT_MONITOR_CRON || '*/15 * * * *';

  if (enabled) {
    log(colors.green, 'ENABLED', `Cron schedule: "${cron}"`);
    log(colors.cyan, 'INFO', 'Monitor akan berjalan setiap 15 menit (default)');
  } else {
    log(colors.yellow, 'DISABLED', 'ENDPOINT_MONITOR_ENABLED=false');
    log(colors.yellow, 'INFO', 'Set ENDPOINT_MONITOR_ENABLED=true to enable');
  }
}

function displayDeploymentSteps() {
  console.log('\n' + colors.cyan + '════════════════════════════════════════════════════════════' + colors.reset);
  console.log(colors.cyan + 'DEPLOYMENT STEPS' + colors.reset);
  console.log(colors.cyan + '════════════════════════════════════════════════════════════' + colors.reset + '\n');

  const steps = [
    '1. Update .env on server dengan nilai dari script ini',
    '2. Restart Docker Compose services:',
    '   docker-compose restart scheduler worker api',
    '3. Verifikasi scheduler container logs:',
    '   docker-compose logs -f scheduler',
    '4. Trigger test dari API endpoint:',
    '   curl -X POST http://localhost:5000/api/v1/jobs/endpoint-monitor \\',
    '     -H "Authorization: Bearer <admin_token>"',
    '5. Periksa notifikasi di Telegram group: "Audira WEB/API komik"',
    '6. Monitor logs untuk konfirmasi:',
    '   docker-compose logs -f worker',
  ];

  steps.forEach((step) => {
    console.log(`  ${step}`);
  });

  console.log('\n');
}

async function main() {
  console.log('\n' + colors.cyan + '╔════════════════════════════════════════════════════════════╗' + colors.reset);
  console.log(colors.cyan + '║     ENDPOINT MONITOR SETUP VERIFICATION                    ║' + colors.reset);
  console.log(colors.cyan + '╚════════════════════════════════════════════════════════════╝\n' + colors.reset);

  const envOk = verifyEnvironmentVariables();
  console.log('');

  const telegramOk = await verifyTelegramConnection();
  console.log('');

  displaySchedulerInfo();
  console.log('');

  const summaryColor = envOk && telegramOk ? colors.green : colors.yellow;
  log(summaryColor, 'STATUS', `${envOk && telegramOk ? '✅ ALL CHECKS PASSED' : '⚠️  REVIEW REQUIRED'}`);

  displayDeploymentSteps();
}

main().catch((err) => {
  log(colors.red, 'FATAL', err.message);
  process.exit(1);
});
