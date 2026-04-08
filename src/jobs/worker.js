'use strict';

require('dotenv').config();

const { Worker } = require('bullmq');
const { connection, SCRAPER_QUEUE_NAME } = require('./queue');
const { buildScraperArgs, runNodeJob, getProjectRoot } = require('./jobRunner');
const logger = require('../config/logger');

const JOB_TIMEOUT_MS = parseInt(process.env.SCRAPER_JOB_TIMEOUT_MS || String(60 * 60 * 1000), 10);
const CONCURRENCY = parseInt(process.env.SCRAPER_WORKER_CONCURRENCY || '1', 10);

function createScraperWorker() {
  const worker = new Worker(
    SCRAPER_QUEUE_NAME,
    async (job) => {
      const startedAt = Date.now();
      const args = buildScraperArgs(job.name, job.data || {});

      logger.info('Starting scraper job', {
        queue: SCRAPER_QUEUE_NAME,
        jobId: job.id,
        name: job.name,
        args,
      });

      const result = await runNodeJob(args, {
        timeoutMs: JOB_TIMEOUT_MS,
        cwd: getProjectRoot(),
        maxBufferBytes: 256 * 1024,
      });

      const durationMs = Date.now() - startedAt;
      logger.info('Completed scraper job', {
        queue: SCRAPER_QUEUE_NAME,
        jobId: job.id,
        name: job.name,
        durationMs,
      });

      return {
        durationMs,
        stdoutTail: result.stdout.slice(-1000),
        stderrTail: result.stderr.slice(-1000),
      };
    },
    { connection, concurrency: CONCURRENCY }
  );

  worker.on('failed', (job, err) => {
    logger.error('Scraper job failed', {
      queue: SCRAPER_QUEUE_NAME,
      jobId: job?.id,
      name: job?.name,
      error: err.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info('Scraper job acknowledged', {
      queue: SCRAPER_QUEUE_NAME,
      jobId: job.id,
      name: job.name,
    });
  });

  return worker;
}

async function shutdown(worker) {
  logger.info('Shutting down scraper worker...');
  await worker.close();
  await connection.quit();
  process.exit(0);
}

if (require.main === module) {
  const worker = createScraperWorker();
  process.on('SIGINT', () => shutdown(worker));
  process.on('SIGTERM', () => shutdown(worker));

  logger.info('Scraper worker is running', {
    queue: SCRAPER_QUEUE_NAME,
    concurrency: CONCURRENCY,
  });
}

module.exports = { createScraperWorker, shutdown };
