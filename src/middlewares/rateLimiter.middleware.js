const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');
const { getRedisClient } = require('../config/redis');

/**
 * Build a Redis-backed store with a unique prefix for each rate limiter.
 * express-rate-limit requires each limiter to have its own store instance.
 * Falls back to the default MemoryStore so the app works without Redis.
 */
const buildStore = (prefix) => {
  const client = getRedisClient();
  if (!client) return undefined;
  try {
    const { RedisStore } = require('rate-limit-redis');
    return new RedisStore({ prefix, sendCommand: (...args) => client.call(...args) });
  } catch {
    return undefined;
  }
};

/** Global API limiter — keyed by IP */
const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:api:'),
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
});

/**
 * Auth route limiter — keyed by authenticated user ID when available,
 * falls back to IP. Prevents credential stuffing at scale.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:auth:'),
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'Too many auth attempts, please try again later.',
  },
});

/**
 * Strict per-user limiter for sensitive endpoints (rating, profile update, etc.).
 * 60 req / 15 min per authenticated user (or IP if unauthenticated).
 */
const userActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:user:'),
  keyGenerator: (req) => req.user?.id || req.ip,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
});

/**
 * Dashboard telemetry limiter. Kept separate from API limiter because
 * dashboard polling is frequent and should have its own threshold.
 */
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: buildStore('rl:dashboard:'),
  message: {
    success: false,
    message: 'Too many dashboard requests, please slow down.',
  },
});

module.exports = { apiLimiter, authLimiter, userActionLimiter, dashboardLimiter };
