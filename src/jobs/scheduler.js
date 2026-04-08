'use strict';

require('dotenv').config();

const { scraperQueue, connection } = require('./queue');
const logger = require('../config/logger');

const SERIES_CRON = process.env.SCRAPER_SERIES_CRON || '0 3 * * *';
const EPISODE_CRON = process.env.SCRAPER_EPISODE_CRON || '0 */6 * * *';
const FULL_EPISODE_CRON = process.env.SCRAPER_FULL_EPISODE_CRON || '0 1 * * 0';
const SCRAPER_TZ = process.env.SCRAPER_TZ || 'Asia/Jakarta';

async function upsertRepeatableJobs() {
  await scraperQueue.upsertJobScheduler('series-sync-schedule', {
    pattern: SERIES_CRON,
    tz: SCRAPER_TZ,
  }, {
    name: 'series-sync',
    data: { dryRun: process.env.SCRAPER_DRY_RUN === 'true' },
  });

  await scraperQueue.upsertJobScheduler('episode-sync-ongoing-schedule', {
    pattern: EPISODE_CRON,
    tz: SCRAPER_TZ,
  }, {
    name: 'episode-sync-ongoing',
    data: { dryRun: process.env.SCRAPER_DRY_RUN === 'true' },
  });

  await scraperQueue.upsertJobScheduler('episode-sync-full-schedule', {
    pattern: FULL_EPISODE_CRON,
    tz: SCRAPER_TZ,
  }, {
    name: 'episode-sync-full',
    data: { dryRun: process.env.SCRAPER_DRY_RUN === 'true' },
  });
}

async function bootstrap() {
  logger.info('Registering queue-based scraper schedules', {
    seriesCron: SERIES_CRON,
    episodeCron: EPISODE_CRON,
    fullEpisodeCron: FULL_EPISODE_CRON,
    timezone: SCRAPER_TZ,
  });

  await upsertRepeatableJobs();

  if (process.env.SCRAPER_RUN_ON_STARTUP === 'true') {
    await scraperQueue.add(
      'episode-sync-ongoing',
      { dryRun: process.env.SCRAPER_DRY_RUN === 'true' },
      { jobId: 'startup-episode-sync-ongoing' }
    );
    logger.info('Startup job enqueued: episode-sync-ongoing');
  }

  logger.info('Scheduler is active. Keep this process running to maintain schedules.');
}

async function shutdown() {
  logger.info('Shutting down scheduler...');
  await scraperQueue.close();
  await connection.quit();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error('Scheduler bootstrap failed', { error: err.message });
    process.exit(1);
  });
}

module.exports = {
  upsertRepeatableJobs,
  bootstrap,
  shutdown,
};
