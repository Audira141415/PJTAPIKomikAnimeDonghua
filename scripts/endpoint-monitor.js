'use strict';
require('module-alias/register');

require('dotenv').config();
const os = require('os');
const { execSync } = require('child_process');
const telegram = require('@core/utils/telegram');
const Redis = require('ioredis');

const BASE_URL = (process.env.ENDPOINT_MONITOR_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL);

// --- ARGS ---
const args = process.argv.slice(2);
const IS_HEARTBEAT = args.includes('--heartbeat');

/**
 * 🕵️ SYSTEM SENTINEL (Enhanced)
 */

async function getDiskUsage() {
  try {
    const stdout = execSync("df -h / | tail -1 | awk '{print $5}'").toString().trim();
    return parseInt(stdout.replace('%', ''), 10);
  } catch (e) {
    return 0;
  }
}

async function getTrafficStats() {
  const currentHits = await redis.get('stats:total_requests') || 0;
  const lastHourHits = await redis.get('stats:last_hour_requests') || 0;
  return {
    total: parseInt(currentHits, 10),
    increase: parseInt(currentHits, 10) - parseInt(lastHourHits, 10)
  };
}

const TARGETS = [
  { path: '/health', name: 'Core API' },
  { path: '/api/v1/latest', name: 'Comic Data' },
  { path: '/dashboard/status', name: 'Dashboard' }
];

async function runSentinel() {
  console.log(`--- SENTINEL MONITOR STARTING (Heartbeat: ${IS_HEARTBEAT}) ---`);
  
  let issues = [];
  let systemAlerts = [];
  let recoveryNotifs = [];

  // 1. Endpoint Checking
  for (const target of TARGETS) {
    const redisKey = `monitor:status:${target.name.toLowerCase().replace(/\s/g, '_')}`;
    const lastStatus = await redis.get(redisKey); // 'ok' or 'fail'
    
    let currentStatus = 'ok';
    let errorMsg = '';

    try {
      const start = Date.now();
      const res = await fetch(`${BASE_URL}${target.path}`, { signal: AbortSignal.timeout(8000) });
      const latency = Date.now() - start;

      if (!res.ok) {
        currentStatus = 'fail';
        errorMsg = `Status ${res.status}`;
      } else if (latency > 3000) {
        systemAlerts.push(`🐢 <b>Latency Warning</b>: ${target.name} slow (${latency}ms)`);
      }
    } catch (err) {
      currentStatus = 'fail';
      errorMsg = `UNREACHABLE (${err.message})`;
    }

    // Logic: State Transition
    if (currentStatus === 'fail') {
      issues.push(`❌ <b>${target.name}</b>: ${errorMsg}`);
      await redis.set(redisKey, 'fail', 'EX', 86400);
    } else {
      if (lastStatus === 'fail') {
        recoveryNotifs.push(`✅ <b>${target.name}</b>: RESTORED (Running normally)`);
      }
      await redis.set(redisKey, 'ok', 'EX', 86400);
    }
  }

  // 2. System Metrics
  const disk = await getDiskUsage();
  if (disk > 85) {
    systemAlerts.push(`💾 <b>Disk Full Warning</b>: Hardisk server sudah ${disk}%!`);
  }

  const traffic = await getTrafficStats();

  // --- NOTIFICATION LOGIC ---
  
  // A. Recovery Notification (Send immediately if something is fixed)
  if (recoveryNotifs.length > 0) {
    await telegram.sendAlert(
      'System Restored',
      `<b>Layanan kembali normal:</b>\n${recoveryNotifs.join('\n')}`,
      'success'
    );
  }

  // B. Failure Notification (Send if currently failing)
  if (issues.length > 0) {
    // We send every time it fails (up to scheduler frequency) 
    // but maybe we should throttle it? 
    // To keep it simple for now, we send if issues found.
    await telegram.sendAlert(
      'System Alert: Issues Detected',
      `<b>Masalah ditemukan pada:</b>\n${issues.join('\n')}`,
      'critical'
    );
  } 
  
  // C. Heartbeat / Morning Report
  if (IS_HEARTBEAT && issues.length === 0) {
    const message = [
      `🌟 <b>System Health:</b> <code>Perfectly Normal</code>`,
      `📦 <b>Endpoints:</b> <code>${TARGETS.length} OK</code>`,
      `💾 <b>Disk Usage:</b> <code>${disk}%</code>`,
      `📈 <b>Total Traffic:</b> <code>${traffic.total} req</code>`,
      `📊 <b>Hourly Growth:</b> <code>${traffic.increase > 0 ? '+' : ''}${traffic.increase} req/h</code>`
    ].join('\n');

    await telegram.sendAlert('System Heartbeat', message, 'info');
  }

  // D. System Alerts (Performance warnings etc.)
  if (systemAlerts.length > 0 && issues.length === 0 && !IS_HEARTBEAT) {
    // Only send performance alerts if no heartbeat (heartbeat already includes disk etc)
    await telegram.sendAlert(
      'System Performance Warning',
      `${systemAlerts.join('\n')}`,
      'warning'
    );
  }

  console.log('--- SENTINEL MONITOR FINISHED ---');
  process.exit(0);
}

runSentinel().catch(err => {
  console.error('Sentinel Error:', err);
  process.exit(1);
});
