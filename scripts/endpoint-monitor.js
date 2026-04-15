'use strict';

require('dotenv').config();

const DEFAULT_TIMEOUT_MS = parseInt(process.env.ENDPOINT_MONITOR_TIMEOUT_MS || '10000', 10);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const NOTIFY_ON_SUCCESS = process.env.ENDPOINT_MONITOR_NOTIFY_ON_SUCCESS === 'true';
const MAX_FAIL_LINES = parseInt(process.env.ENDPOINT_MONITOR_MAX_FAIL_LINES || '20', 10);
const MAX_TARGETS = parseInt(process.env.ENDPOINT_MONITOR_MAX_TARGETS || '50', 10);
const ALLOW_PRIVATE_BASE_URL = process.env.ENDPOINT_MONITOR_ALLOW_PRIVATE_BASE_URL !== 'false';

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

function buildTelegramMessage(summary) {
  const lines = [];
  lines.push('Audira API Endpoint Monitor');
  lines.push(`Time: ${nowIso()}`);
  lines.push(`Base URL: ${BASE_URL}`);
  lines.push(`Result: ${summary.failedCount === 0 ? 'OK' : 'FAILED'}`);
  lines.push(`Checked: ${summary.total} | Success: ${summary.successCount} | Failed: ${summary.failedCount}`);

  if (summary.failedCount > 0) {
    lines.push('');
    lines.push('Failed endpoints:');
    summary.failed.slice(0, MAX_FAIL_LINES).forEach((item) => {
      const detail = item.error ? item.error : `status=${item.status}`;
      lines.push(`- ${item.method} ${item.path} (${detail}, ${item.latencyMs}ms)`);
    });
    if (summary.failed.length > MAX_FAIL_LINES) {
      lines.push(`- ... and ${summary.failed.length - MAX_FAIL_LINES} more`);
    }
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
    // Sequential check to keep pressure low on the API server.
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

  const shouldNotify = summary.failedCount > 0 || NOTIFY_ON_SUCCESS;
  let telegram = { sent: false, reason: 'not_required' };

  if (shouldNotify) {
    const message = buildTelegramMessage(summary);
    try {
      telegram = await sendTelegram(message);
    } catch (error) {
      telegram = { sent: false, reason: error.message };
    }
  }

  const output = {
    timestamp: nowIso(),
    summary: {
      total: summary.total,
      successCount: summary.successCount,
      failedCount: summary.failedCount,
    },
    failed: summary.failed.map((item) => ({
      method: item.method,
      path: item.path,
      status: item.status,
      latencyMs: item.latencyMs,
      error: item.error,
    })),
    telegram,
  };

  console.log(JSON.stringify(output, null, 2));

  if (summary.failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[endpoint-monitor] fatal', error.message);
  process.exitCode = 1;
});
