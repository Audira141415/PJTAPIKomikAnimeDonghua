'use strict';

require('dotenv').config();

const DEFAULT_TIMEOUT_MS = parseInt(process.env.ENDPOINT_MONITOR_TIMEOUT_MS || '10000', 10);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const NOTIFY_ON_SUCCESS = process.env.ENDPOINT_MONITOR_NOTIFY_ON_SUCCESS === 'true';
const MAX_FAIL_LINES = parseInt(process.env.ENDPOINT_MONITOR_MAX_FAIL_LINES || '20', 10);
const MAX_TARGETS = parseInt(process.env.ENDPOINT_MONITOR_MAX_TARGETS || '50', 10);
const ALLOW_PRIVATE_BASE_URL = process.env.ENDPOINT_MONITOR_ALLOW_PRIVATE_BASE_URL !== 'false';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const Redis = require('ioredis');
let redis = null;

function getRedis() {
  if (redis) return redis;
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times <= 3 ? 1000 : null),
  });
  redis.on('error', (err) => console.error('[endpoint-monitor] Redis Error:', err.message));
  return redis;
}

const DEFAULT_TARGETS = [
  { method: 'GET', path: '/health', expectedStatus: [200] },
  { method: 'GET', path: '/dashboard/status', expectedStatus: [200] },
  { method: 'GET', path: '/dashboard/activity?limit=5', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/search?q=naruto', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/mangas?limit=1', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/latest', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/popular', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/trending', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/anime/home', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/animesail/home', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/comic/health', expectedStatus: [200] },
  { method: 'GET', path: '/api/v1/comic/latest', expectedStatus: [200] },
];

function isPrivateHost(hostname) {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }
  return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(hostname);
}

function normalizeBaseUrl(rawValue) {
  const fallback = 'http://127.0.0.1:5000';
  const candidate = (rawValue || fallback).trim();

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('ENDPOINT_MONITOR_BASE_URL is not a valid URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('ENDPOINT_MONITOR_BASE_URL must use http or https');
  }

  if (parsed.username || parsed.password) {
    throw new Error('ENDPOINT_MONITOR_BASE_URL must not contain credentials');
  }

  if (!ALLOW_PRIVATE_BASE_URL && isPrivateHost(parsed.hostname)) {
    throw new Error('ENDPOINT_MONITOR_BASE_URL private hosts are disabled by configuration');
  }

  return parsed.toString().replace(/\/$/, '');
}

const BASE_URL = normalizeBaseUrl(process.env.ENDPOINT_MONITOR_BASE_URL);

function parseTargets() {
  const raw = process.env.ENDPOINT_MONITOR_TARGETS;
  if (!raw || !raw.trim()) {
    return DEFAULT_TARGETS;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_TARGETS;
    }

    return parsed
      .map((item) => ({
        method: String(item.method || 'GET').toUpperCase(),
        path: String(item.path || '/').trim(),
        expectedStatus: Array.isArray(item.expectedStatus) && item.expectedStatus.length > 0
          ? item.expectedStatus.map((v) => parseInt(v, 10)).filter((v) => Number.isFinite(v))
          : [200],
      }))
      .filter((item) => item.path)
      .slice(0, Number.isFinite(MAX_TARGETS) && MAX_TARGETS > 0 ? MAX_TARGETS : 50);
  } catch (error) {
    console.error(`[endpoint-monitor] failed to parse ENDPOINT_MONITOR_TARGETS, using defaults: ${error.message}`);
    return DEFAULT_TARGETS;
  }
}

function nowIso() {
  return new Date().toISOString();
}

async function checkEndpoint(target) {
  const url = `${BASE_URL}${target.path.startsWith('/') ? '' : '/'}${target.path}`;
  const startedAt = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    const response = await fetch(url, {
      method: target.method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json,text/plain,*/*',
      },
    });

    clearTimeout(timeout);

    const latencyMs = Date.now() - startedAt;
    const ok = target.expectedStatus.includes(response.status);

    return {
      method: target.method,
      path: target.path,
      url,
      status: response.status,
      latencyMs,
      ok,
      error: null,
    };
  } catch (error) {
    return {
      method: target.method,
      path: target.path,
      url,
      status: null,
      latencyMs: Date.now() - startedAt,
      ok: false,
      error: error?.name === 'AbortError' ? 'timeout' : (error?.message || 'request failed'),
    };
  }
}

function buildTelegramMessage(summary, { type = 'alert' } = {}) {
  const lines = [];
  const emoji = type === 'recovery' ? '✅' : '🚨';
  const title = type === 'recovery' ? 'RECOVERY: Audira API Services' : 'ALERT: Audira API Services';

  lines.push(`${emoji} *${title}*`);
  lines.push(`*Time:* ${nowIso()}`);
  lines.push(`*Base URL:* \`${BASE_URL}\``);
  lines.push(`*Status:* ${summary.failedCount === 0 ? 'ALL OK' : 'ISSUES DETECTED'}`);
  lines.push(`*Checks:* ${summary.total} (Success: ${summary.successCount}, Failed: ${summary.failedCount})`);

  if (summary.failedCount > 0) {
    lines.push('');
    lines.push('*Failed endpoints:*');
    summary.failed.slice(0, MAX_FAIL_LINES).forEach((item) => {
      const detail = item.error ? item.error : `status=${item.status}`;
      lines.push(`• \`${item.method} ${item.path}\` (${detail}, ${item.latencyMs}ms)`);
    });
    if (summary.failed.length > MAX_FAIL_LINES) {
      lines.push(`• ... and ${summary.failed.length - MAX_FAIL_LINES} more`);
    }
  } else if (type === 'recovery') {
    lines.push('');
    lines.push('Semua layanan target kembali berfungsi normal.');
  }

  return lines.join('\n');
}

async function sendTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    return { sent: false, reason: 'telegram_not_configured' };
  }

  const endpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`telegram_send_failed_http_${response.status}`);
  }

  return { sent: true };
}

async function main() {
  const targets = parseTargets();
  const checks = [];

  for (const target of targets) {
    const result = await checkEndpoint(target);
    checks.push(result);
  }

  const failed = checks.filter((item) => !item.ok);
  const summary = {
    baseUrl: BASE_URL,
    total: checks.length,
    successCount: checks.length - failed.length,
    failedCount: failed.length,
    failed,
    checks,
  };

  // --- STATEFUL LOGIC ---
  const client = getRedis();
  const STATE_KEY = 'endpoint-monitor:last-failed-count';
  const DETAIL_KEY = 'endpoint-monitor:last-states';

  let lastFailedCount = 0;
  let lastStates = {};
  try {
    const rawCount = await client.get(STATE_KEY);
    lastFailedCount = rawCount !== null ? parseInt(rawCount, 10) : 0;
    const rawStates = await client.get(DETAIL_KEY);
    lastStates = rawStates ? JSON.parse(rawStates) : {};
  } catch (err) {
    console.warn('[endpoint-monitor] Redis read failed, falling back to stateless:', err.message);
  }

  // Calculate if anything changed
  const currentStates = {};
  checks.forEach((c) => {
    currentStates[`${c.method}:${c.path}`] = c.ok ? 'UP' : 'DOWN';
  });

  let hasChanged = false;
  let isRecovery = false;

  // 1. Check for new failures or recoveries
  for (const key of Object.keys(currentStates)) {
    if (currentStates[key] !== lastStates[key]) {
      hasChanged = true;
      if (currentStates[key] === 'UP' && lastStates[key] === 'DOWN') {
        // We only mark as recovery if the WHOLE system becomes cleaner or specific criticals return
        // but for simplicity, any change in status is a prompt for notification.
      }
    }
  }

  // If ALL were failed and now ALL are OK -> Recovery
  if (lastFailedCount > 0 && summary.failedCount === 0) {
    isRecovery = true;
    hasChanged = true;
  }

  // If it was OK and now it's FAILED -> Alert
  if (lastFailedCount === 0 && summary.failedCount > 0) {
    hasChanged = true;
  }

  // Professional Rule: Only notify on status CHANGE, unless NOTIFY_ON_SUCCESS is true
  const shouldNotify = NOTIFY_ON_SUCCESS || hasChanged;
  let telegram = { sent: false, reason: 'no_change' };

  if (shouldNotify) {
    // If it's a recovery (failedCount 0 but last count > 0)
    const msgType = isRecovery ? 'recovery' : 'alert';
    const message = buildTelegramMessage(summary, { type: msgType });
    
    try {
      telegram = await sendTelegram(message);
    } catch (error) {
      telegram = { sent: false, reason: error.message };
    }
  }

  // Persist state
  try {
    await client.set(STATE_KEY, summary.failedCount);
    await client.set(DETAIL_KEY, JSON.stringify(currentStates));
  } catch (err) {
    console.error('[endpoint-monitor] Redis write failed:', err.message);
  }

  const output = {
    timestamp: nowIso(),
    summary: {
      total: summary.total,
      successCount: summary.successCount,
      failedCount: summary.failedCount,
      hasChanged,
      isRecovery,
    },
    telegram,
  };

  console.log(JSON.stringify(output, null, 2));

  // Exit with cleanup
  if (redis) {
    await redis.quit().catch(() => {});
  }

  if (summary.failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[endpoint-monitor] fatal', error.message);
  process.exitCode = 1;
});
