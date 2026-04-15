'use strict';

require('dotenv').config();

const { scraperQueue, connection } = require('./queue');
const logger = require('../config/logger');

const SERIES_CRON = process.env.SCRAPER_SERIES_CRON || '0 3 * * *';
const EPISODE_CRON = process.env.SCRAPER_EPISODE_CRON || '0 */6 * * *';
const FULL_EPISODE_CRON = process.env.SCRAPER_FULL_EPISODE_CRON || '0 1 * * 0';
const ANIME_ALL_CRON = process.env.SCRAPER_ANIME_ALL_CRON || '0 2 * * *';
const COMIC_DAILY_CRON = process.env.SCRAPER_COMIC_DAILY_CRON || '0 4 * * *';
const COMIC_SOURCES_CRON = process.env.SCRAPER_COMIC_SOURCES_CRON || '0 5 * * *';
const FULL_IMPORT_CRON = process.env.SCRAPER_FULL_IMPORT_CRON || '0 6 * * *';
const ENDPOINT_MONITOR_CRON = process.env.ENDPOINT_MONITOR_CRON || '*/15 * * * *';
const ENDPOINT_MONITOR_ENABLED = process.env.ENDPOINT_MONITOR_ENABLED === 'true';
const SCRAPER_TZ = process.env.SCRAPER_TZ || 'Asia/Jakarta';
const SCRAPER_API_BASE_URL = process.env.SCRAPER_API_BASE_URL || null;
const SCRAPER_ANIME_LIMIT = Number.parseInt(process.env.SCRAPER_ANIME_LIMIT_PER_SOURCE || '200', 10);

async function upsertRepeatableJobs() {
  await scraperQueue.upsertJobScheduler('anime-sync-all-schedule', {
    pattern: ANIME_ALL_CRON,
    tz: SCRAPER_TZ,
  }, {
    name: 'anime-sync-all',
    data: {
      limit: Number.isFinite(SCRAPER_ANIME_LIMIT) ? SCRAPER_ANIME_LIMIT : 200,
      ...(SCRAPER_API_BASE_URL ? { baseUrl: SCRAPER_API_BASE_URL } : {}),
    },
  });

  await scraperQueue.upsertJobScheduler('comic-sync-daily-schedule', {
    pattern: COMIC_DAILY_CRON,
    tz: SCRAPER_TZ,
  }, {
    name: 'comic-sync-daily',
    data: {},
  });

  await scraperQueue.upsertJobScheduler('comic-sync-sources-schedule', {
    pattern: COMIC_SOURCES_CRON,
    tz: SCRAPER_TZ,
  }, {
    name: 'comic-sync-sources',
    data: {
      sources: 'all',
      page: 1,
    },
  });

  await scraperQueue.upsertJobScheduler('full-import-daily-schedule', {
    pattern: FULL_IMPORT_CRON,
    tz: SCRAPER_TZ,
  }, {
    name: 'full-import-daily',
    data: {},
  });

  if (ENDPOINT_MONITOR_ENABLED) {
    await scraperQueue.upsertJobScheduler('endpoint-monitor-schedule', {
      pattern: ENDPOINT_MONITOR_CRON,
      tz: SCRAPER_TZ,
    }, {
      name: 'endpoint-monitor',
      data: {},
    });
  }

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
    animeAllCron: ANIME_ALL_CRON,
    comicDailyCron: COMIC_DAILY_CRON,
    comicSourcesCron: COMIC_SOURCES_CRON,
    fullImportCron: FULL_IMPORT_CRON,
    endpointMonitorCron: ENDPOINT_MONITOR_CRON,
    endpointMonitorEnabled: ENDPOINT_MONITOR_ENABLED,
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
