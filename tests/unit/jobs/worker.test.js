'use strict';

const mockWorkerCtor = jest.fn();

jest.mock('bullmq', () => ({
  Worker: function WorkerMock(queueName, processor) {
    mockWorkerCtor(queueName, processor);
    return {
      on: jest.fn(),
      close: jest.fn().mockResolvedValue(),
    };
  },
}));

jest.mock('../../../src/jobs/queue', () => ({
  connection: { quit: jest.fn().mockResolvedValue() },
  SCRAPER_QUEUE_NAME: 'scraper-jobs',
}));

jest.mock('../../../src/jobs/jobRunner', () => ({
  buildScraperArgs: jest.fn().mockReturnValue(['scripts/anichin-scraper.js', '--update']),
  runNodeJob: jest.fn().mockResolvedValue({ stdout: 'ok', stderr: '' }),
  getProjectRoot: jest.fn().mockReturnValue('/tmp/project'),
}));

jest.mock('../../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

const { createScraperWorker } = require('../../../src/jobs/worker');
const { runNodeJob } = require('../../../src/jobs/jobRunner');

describe('jobs/worker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates worker with expected queue name', () => {
    createScraperWorker();
    expect(mockWorkerCtor).toHaveBeenCalled();
    expect(mockWorkerCtor.mock.calls[0][0]).toBe('scraper-jobs');
  });

  it('worker processor runs scraper command with timeout and bounded buffer', async () => {
    createScraperWorker();
    const processor = mockWorkerCtor.mock.calls[0][1];

    const result = await processor({ id: '1', name: 'series-sync', data: {} });

    expect(runNodeJob).toHaveBeenCalledWith(
      ['scripts/anichin-scraper.js', '--update'],
      expect.objectContaining({ maxBufferBytes: 256 * 1024 })
    );
    expect(result).toHaveProperty('durationMs');
  });
});
