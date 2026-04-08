'use strict';

const mockUpsert = jest.fn().mockResolvedValue(undefined);
const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockCloseQueue = jest.fn().mockResolvedValue(undefined);
const mockQuit = jest.fn().mockResolvedValue(undefined);

const mockWorkerCtor = jest.fn();
const mockBuildScraperArgs = jest.fn();
const mockRunNodeJob = jest.fn();

jest.mock('../../src/jobs/queue', () => ({
  scraperQueue: {
    upsertJobScheduler: (...args) => mockUpsert(...args),
    add: (...args) => mockAdd(...args),
    close: () => mockCloseQueue(),
  },
  connection: {
    quit: () => mockQuit(),
  },
  SCRAPER_QUEUE_NAME: 'scraper-jobs',
}));

jest.mock('bullmq', () => ({
  Worker: function WorkerMock(queueName, processor) {
    mockWorkerCtor(queueName, processor);
    return {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
  },
}));

jest.mock('../../src/jobs/jobRunner', () => ({
  buildScraperArgs: (...args) => mockBuildScraperArgs(...args),
  runNodeJob: (...args) => mockRunNodeJob(...args),
  getProjectRoot: () => process.cwd(),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const { bootstrap } = require('../../src/jobs/scheduler');
const { createScraperWorker } = require('../../src/jobs/worker');

describe('scheduler -> queue -> worker e2e flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SCRAPER_RUN_ON_STARTUP = 'true';
  });

  it('registers schedules, enqueues startup job, and worker executes job processor', async () => {
    mockBuildScraperArgs.mockReturnValue(['scripts/anichin-scraper.js', '--episodes', '--update']);
    mockRunNodeJob.mockResolvedValue({ code: 0, stdout: 'ok', stderr: '' });

    await bootstrap();

    expect(mockUpsert).toHaveBeenCalledTimes(3);
    expect(mockAdd).toHaveBeenCalledWith(
      'episode-sync-ongoing',
      expect.any(Object),
      expect.objectContaining({ jobId: 'startup-episode-sync-ongoing' })
    );

    createScraperWorker();

    expect(mockWorkerCtor).toHaveBeenCalled();
    expect(mockWorkerCtor.mock.calls[0][0]).toBe('scraper-jobs');

    const processor = mockWorkerCtor.mock.calls[0][1];
    const result = await processor({ id: 'job-1', name: 'episode-sync-ongoing', data: { dryRun: false } });

    expect(mockBuildScraperArgs).toHaveBeenCalledWith('episode-sync-ongoing', { dryRun: false });
    expect(mockRunNodeJob).toHaveBeenCalled();
    expect(result).toHaveProperty('durationMs');
  });
});
