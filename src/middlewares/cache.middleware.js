'use strict';

const { getRedisClient } = require('@core/database/redis');
const logger = require('@core/utils/logger');

/**
 * High-performance Redis Response Caching Middleware
 * @param {number} ttl - Time to live in seconds
 */
const cacheMiddleware = (ttl = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    // Bypass cache if Cache-Control: no-cache is present
    if (req.header('Cache-Control') === 'no-cache') {
      logger.debug(`[Cache] Bypass requested for ${req.originalUrl}`);
      return next();
    }

    const redis = getRedisClient();
    if (!redis) return next();

    const key = `cache:res:${req.originalUrl}`;

    try {
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        logger.debug(`[Cache] HIT: ${key}`);
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('Content-Type', 'application/json');
        return res.send(cachedResponse);
      }

      // If MISS, intercept res.json to store the result
      logger.debug(`[Cache] MISS: ${key}`);
      res.setHeader('X-Cache', 'MISS');

      const originalJson = res.json;
      res.json = function (data) {
        // Restore original res.json and call it
        res.json = originalJson;
        
        // Store in Redis asynchronously
        if (res.statusCode === 200) {
          setImmediate(async () => {
            try {
              await redis.set(key, JSON.stringify(data), 'EX', ttl);
            } catch (err) {
              logger.warn(`[Cache] Failed to store ${key}: ${err.message}`);
            }
          });
        }
        
        return res.json(data);
      };

      next();
    } catch (err) {
      logger.warn(`[Cache] Middleware error: ${err.message}`);
      next();
    }
  };
};

module.exports = cacheMiddleware;
