const { getRedisClient } = require('@core/database/redis');

/**
 * Default TTLs in seconds.
 */
const TTL = {
  MANGA_LIST:   5  * 60,  // 5 min  — changes on every create/update/delete
  MANGA_DETAIL: 15 * 60,  // 15 min — changes only on update/delete
};

/**
 * Get a cached value. Returns null on miss or when Redis is unavailable.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
const get = async (key) => {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // degrade gracefully
  }
};

/**
 * Set a cached value with TTL.
 * @param {string} key
 * @param {any}    value
 * @param {number} ttlSeconds
 */
const set = async (key, value, ttlSeconds) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // degrade gracefully
  }
};

/**
 * Delete one or more keys (accepts wildcard via KEYS — dev only).
 * For production use del() with exact keys only.
 * @param {...string} keys
 */
const del = async (...keys) => {
  const client = getRedisClient();
  if (!client || keys.length === 0) return;
  try {
    await client.del(...keys);
  } catch {
    // degrade gracefully
  }
};

/**
 * Scan and delete all keys matching a pattern (e.g. 'manga:list:*').
 * Uses cursor-based SCAN — safe for production at small-to-medium scale.
 * @param {string} pattern
 */
const delPattern = async (pattern) => {
  const client = getRedisClient();
  if (!client) return;
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) await client.del(...keys);
    } while (cursor !== '0');
  } catch {
    // degrade gracefully
  }
};

module.exports = { get, set, del, delPattern, TTL };
