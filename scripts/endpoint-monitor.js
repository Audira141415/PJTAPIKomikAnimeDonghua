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

/**
 * 🕵️ SYSTEM SENTINEL (Hidden Features Implementation)
 */

async function getDiskUsage() {
  try {
    // Linux/Unix command for disk usage
    const stdout = execSync("df -h / | tail -1 | awk '{print $5}'").toString().trim();
    return parseInt(stdout.replace('%', ''), 10);
  } catch (e) {
    return 0;
  }
}

async function getTrafficStats() {
  const currentHits = await redis.get('stats:total_requests') || 0;
  const lastHourHits = await redis.get('stats:last_hour_requests') || 0;
  await redis.set('stats:last_hour_requests', currentHits, 'EX', 3600);
  
  return {
    total: currentHits,
    increase: currentHits - lastHourHits
  };
}

const TARGETS = [
  { path: '/health', name: 'Core API' },
  { path: '/api/v1/latest', name: 'Comic Data' },
  { path: '/dashboard/status', name: 'Dashboard' }
];

async function runSentinel() {
  console.log('--- SENTINEL MONITOR STARTING ---');
  let issues = [];
  let systemAlerts = [];

  // 1. Endpoint Checking
  for (const target of TARGETS) {
    try {
      const start = Date.now();
      const res = await fetch(`${BASE_URL}${target.path}`, { timeout: 8000 });
      const latency = Date.now() - start;

      if (!res.ok) {
        issues.push(`❌ <b>${target.name}</b>: Status ${res.status}`);
      } else if (latency > 2000) {
        systemAlerts.push(`🐢 <b>Latency Warning</b>: ${target.name} lambat (${latency}ms)`);
      }
    } catch (err) {
      issues.push(`❌ <b>${target.name}</b>: UNREACHABLE (${err.message})`);
    }
  }

  // 2. Disk Usage Check (Hidden Feature)
  const disk = await getDiskUsage();
  if (disk > 85) {
    systemAlerts.push(`💾 <b>Disk Full Warning</b>: Hardisk server sudah ${disk}%! Bersihkan logs segera.`);
  }

  // 3. Traffic Anomaly Detection (Hidden Feature)
  const traffic = await getTrafficStats();
  if (traffic.increase > 5000) { // Threshold ledakan traffic
    systemAlerts.push(`🚀 <b>Traffic Surge</b>: Ada lonjakan ${traffic.increase} request dalam 1 jam terakhir!`);
  }

  // --- LOGIC NOTIFIKASI ---
  
  // Jika ada masalah fatal
  if (issues.length > 0) {
    await telegram.sendAlert(
      'System Alert: Issues Detected',
      `<b>Masalah ditemukan pada:</b>\n${issues.join('\n')}`,
      'critical'
    );
  } 
  
  // Jika ada peringatan sistem (tapi masih hidup)
  if (systemAlerts.length > 0 && issues.length === 0) {
    await telegram.sendAlert(
      'System Warning: Performance',
      `<b>Optimasi diperlukan:</b>\n${systemAlerts.join('\n')}`,
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
