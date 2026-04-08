const { env } = require('./env');

let redisClient = null;

/**
 * Lazy-initialises the ioredis client on first call.
 * Returns null if REDIS_URL is not configured — callers must handle the null case
 * gracefully so the app operates without Redis in development.
 */
const getRedisClient = () => {
  if (redisClient) return redisClient;

  if (!env.REDIS_URL) return null;

  // ioredis is an optional dependency — catch require errors cleanly
  let Redis;
  try {
    Redis = require('ioredis'); // eslint-disable-line global-require
  } catch {
    return null;
  }

  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts — no crash, just disable cache
      if (times > 3) return null;
      return Math.min(times * 200, 1000);
    },
  });

  redisClient.on('error', (err) => {
    // Log but never crash — app continues without cache
    const logger = require('./logger'); // eslint-disable-line global-require
    logger.warn('Redis connection error (cache disabled):', err.message);
  });

  return redisClient;
};

module.exports = { getRedisClient };
