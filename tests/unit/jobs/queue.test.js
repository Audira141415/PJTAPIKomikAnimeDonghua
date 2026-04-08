'use strict';

describe('jobs/queue', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.REDIS_URL = 'redis://127.0.0.1:6379';
  });

  it('creates queue with default retry/backoff options', () => {
    const QueueMock = jest.fn().mockImplementation(() => ({}));
    const RedisMock = jest.fn().mockImplementation(() => ({ quit: jest.fn() }));

    jest.doMock('bullmq', () => ({ Queue: QueueMock }));
    jest.doMock('ioredis', () => RedisMock);

    const queueModule = require('../../../src/jobs/queue');

    expect(RedisMock).toHaveBeenCalledWith('redis://127.0.0.1:6379', expect.any(Object));
    expect(QueueMock).toHaveBeenCalledWith('scraper-jobs', expect.objectContaining({
      defaultJobOptions: expect.objectContaining({
        attempts: 3,
      }),
    }));
    expect(queueModule.SCRAPER_QUEUE_NAME).toBe('scraper-jobs');
  });
});
