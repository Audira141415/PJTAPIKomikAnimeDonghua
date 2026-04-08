'use strict';

const { Queue } = require('bullmq');
const { env } = require('../config/env');

let Redis;
try {
  Redis = require('ioredis'); // eslint-disable-line global-require
} catch {
  throw new Error('ioredis is required for queue jobs. Install dependencies first.');
}

if (!env.REDIS_URL) {
  throw new Error('REDIS_URL is required for queue-based scheduler/jobs.');
}

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

const SCRAPER_QUEUE_NAME = 'scraper-jobs';

const scraperQueue = new Queue(SCRAPER_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

module.exports = {
  connection,
  scraperQueue,
  SCRAPER_QUEUE_NAME,
};
