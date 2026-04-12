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

  it('worker processor result includes stdout and stderr tail', async () => {
    const { runNodeJob: mockRun } = require('../../../src/jobs/jobRunner');
    mockRun.mockResolvedValueOnce({ stdout: 'a'.repeat(2000), stderr: 'err' });

    createScraperWorker();
    const processor = mockWorkerCtor.mock.calls[0][1];
    const result = await processor({ id: '2', name: 'test-job', data: {} });

    expect(result.stdoutTail).toHaveLength(1000);
    expect(result.stderrTail).toBe('err');
  });

  it('registers failed and completed event listeners on the worker', () => {
    const worker = createScraperWorker();
    expect(worker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(worker.on).toHaveBeenCalledWith('completed', expect.any(Function));
  });

  it('failed event handler logs the error', () => {
    const logger = require('../../../src/config/logger');
    const worker = createScraperWorker();
    const onCalls = worker.on.mock.calls;
    const failedHandler = onCalls.find(([event]) => event === 'failed')[1];

    failedHandler({ id: 'j1', name: 'bad-job' }, new Error('boom'));

    expect(logger.error).toHaveBeenCalledWith(
      'Scraper job failed',
      expect.objectContaining({ error: 'boom' }),
    );
  });

  it('completed event handler logs the acknowledgement', () => {
    const logger = require('../../../src/config/logger');
    const worker = createScraperWorker();
    const onCalls = worker.on.mock.calls;
    const completedHandler = onCalls.find(([event]) => event === 'completed')[1];

    completedHandler({ id: 'j2', name: 'good-job' });

    expect(logger.info).toHaveBeenCalledWith(
      'Scraper job acknowledged',
      expect.objectContaining({ jobId: 'j2' }),
    );
  });
});
