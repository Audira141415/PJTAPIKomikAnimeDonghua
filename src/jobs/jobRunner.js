'use strict';

const { spawn } = require('child_process');
const path = require('path');

const JOB_COMMAND_MAP = {
  'series-sync': ['scripts/anichin-scraper.js', '--update'],
  'episode-sync-ongoing': ['scripts/anichin-scraper.js', '--episodes', '--update'],
  'episode-sync-full': ['scripts/anichin-scraper.js', '--episodes', '--update'],
  'anime-sync-all': ['scripts/anime-sync-proxy.js', '--update'],
  'comic-sync-daily': ['scripts/mangadex-import.js', '--all', '--update'],
  'comic-sync-sources': ['scripts/comic-sync-daily.js', '--sources', 'all', '--page', '1'],
  'full-import-daily': ['scripts/full-import.js', '--reset-checkpoint'],
  'endpoint-monitor': ['scripts/endpoint-monitor.js'],
  'image-mirroring': ['scripts/mirror-existing.js'],
};

function buildScraperArgs(jobName, jobData = {}) {
  const base = JOB_COMMAND_MAP[jobName];
  if (!base) {
    throw new Error(`Unsupported scraper job: ${jobName}`);
  }

  const args = [...base];

  if (jobData.delayMs) {
    args.push('--delay', String(jobData.delayMs));
  }

  if (jobData.limit) {
    args.push('--limit', String(jobData.limit));
  }

  if (jobData.page) {
    args.push('--page', String(jobData.page));
  }

  if (jobData.sources) {
    args.push('--sources', String(jobData.sources));
  }

  if (jobData.skip) {
    args.push('--skip', String(jobData.skip));
  }

  if (jobData.seriesUrl) {
    args.push('--series-url', String(jobData.seriesUrl));
  }

  if (jobData.baseUrl) {
    args.push('--base-url', String(jobData.baseUrl));
  } else if (process.env.SCRAPER_API_BASE_URL && jobName === 'anime-sync-all') {
    args.push('--base-url', process.env.SCRAPER_API_BASE_URL);
  }

  if (jobData.dryRun) {
    args.push('--dry-run');
  }

  return args;
}

function runNodeJob(args, options = {}) {
  const timeoutMs = options.timeoutMs || 60 * 60 * 1000;
  const cwd = options.cwd || process.cwd();
  const maxBufferBytes = options.maxBufferBytes || 256 * 1024;

  const appendLimited = (target, chunk) => {
    const merged = target + chunk;
    if (Buffer.byteLength(merged, 'utf8') <= maxBufferBytes) {
      return merged;
    }

    // Keep only the newest tail to avoid unbounded memory growth
    const bytes = Buffer.from(merged, 'utf8');
    return bytes.subarray(bytes.length - maxBufferBytes).toString('utf8');
  };

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Job timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = appendLimited(stdout, chunk.toString());
    });

    child.stderr.on('data', (chunk) => {
      stderr = appendLimited(stderr, chunk.toString());
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ code, stdout, stderr });
        return;
      }

      reject(new Error(`Job failed with exit code ${code}. ${stderr || stdout}`));
    });
  });
}

function getProjectRoot() {
  return path.resolve(__dirname, '..', '..');
}

module.exports = {
  buildScraperArgs,
  runNodeJob,
  getProjectRoot,
};
