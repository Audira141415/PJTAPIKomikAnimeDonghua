'use strict';

jest.mock('../../../src/jobs/queue', () => ({
  scraperQueue: {
    upsertJobScheduler: jest.fn().mockResolvedValue({}),
    add: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue({}),
  },
  connection: {
    quit: jest.fn().mockResolvedValue(),
  },
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const { scraperQueue, connection } = require('../../../src/jobs/queue');
const scheduler = require('../../../src/jobs/scheduler');

describe('jobs/scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers three repeatable schedules', async () => {
    await scheduler.upsertRepeatableJobs();
    expect(scraperQueue.upsertJobScheduler).toHaveBeenCalledTimes(3);
  });

  it('enqueues startup job with deterministic jobId when enabled', async () => {
    process.env.SCRAPER_RUN_ON_STARTUP = 'true';

    await scheduler.bootstrap();

    expect(scraperQueue.add).toHaveBeenCalledWith(
      'episode-sync-ongoing',
      expect.any(Object),
      { jobId: 'startup-episode-sync-ongoing' }
    );

    delete process.env.SCRAPER_RUN_ON_STARTUP;
  });

  it('shutdown closes queue and redis connection', async () => {
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);

    await scheduler.shutdown();

    expect(scraperQueue.close).toHaveBeenCalled();
    expect(connection.quit).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });
});
