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

  it('get returns parsed value on cache hit', async () => {
    const get = jest.fn().mockResolvedValue(JSON.stringify({ name: 'naruto' }));
    getRedisClient.mockReturnValueOnce({ get });

    const result = await cache.get('manga:naruto');

    expect(result).toEqual({ name: 'naruto' });
  });

  it('get returns null when key exists but value is empty string', async () => {
    const get = jest.fn().mockResolvedValue(null);
    getRedisClient.mockReturnValueOnce({ get });

    const result = await cache.get('missing-key');

    expect(result).toBeNull();
  });

  it('get returns null when redis client throws', async () => {
    const get = jest.fn().mockRejectedValue(new Error('redis down'));
    getRedisClient.mockReturnValueOnce({ get });

    const result = await cache.get('any-key');

    expect(result).toBeNull();
  });

  it('set is a no-op when redis is unavailable', async () => {
    getRedisClient.mockReturnValueOnce(null);
    // Should resolve without throwing
    await expect(cache.set('k', { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it('set swallows errors from redis', async () => {
    const setex = jest.fn().mockRejectedValue(new Error('write failed'));
    getRedisClient.mockReturnValueOnce({ setex });

    await expect(cache.set('k', { a: 1 }, 60)).resolves.toBeUndefined();
  });

  it('del deletes multiple keys at once', async () => {
    const del = jest.fn().mockResolvedValue(2);
    getRedisClient.mockReturnValueOnce({ del });

    await cache.del('key:1', 'key:2');

    expect(del).toHaveBeenCalledWith('key:1', 'key:2');
  });

  it('del is a no-op when redis is unavailable', async () => {
    getRedisClient.mockReturnValueOnce(null);
    await expect(cache.del('key:1')).resolves.toBeUndefined();
  });

  it('delPattern is a no-op when redis is unavailable', async () => {
    getRedisClient.mockReturnValueOnce(null);
    await expect(cache.delPattern('k:*')).resolves.toBeUndefined();
  });
});
