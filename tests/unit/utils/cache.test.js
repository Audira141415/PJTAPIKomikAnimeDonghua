'use strict';

jest.mock('../../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));

const { getRedisClient } = require('../../../src/config/redis');
const cache = require('../../../src/shared/utils/cache');

describe('shared/utils/cache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('get returns null when redis is unavailable', async () => {
    getRedisClient.mockReturnValueOnce(null);
    await expect(cache.get('k1')).resolves.toBeNull();
  });

  it('set writes JSON payload with TTL', async () => {
    const setex = jest.fn().mockResolvedValue('OK');
    getRedisClient.mockReturnValueOnce({ setex });

    await cache.set('k1', { a: 1 }, 10);

    expect(setex).toHaveBeenCalledWith('k1', 10, JSON.stringify({ a: 1 }));
  });

  it('delPattern scans and deletes all matching keys', async () => {
    const scan = jest.fn()
      .mockResolvedValueOnce(['5', ['k:1', 'k:2']])
      .mockResolvedValueOnce(['0', ['k:3']]);
    const del = jest.fn().mockResolvedValue(3);

    getRedisClient.mockReturnValueOnce({ scan, del });
    await cache.delPattern('k:*');

    expect(scan).toHaveBeenCalled();
    expect(del).toHaveBeenCalledTimes(2);
  });
});
