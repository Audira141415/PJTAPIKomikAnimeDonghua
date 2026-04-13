'use strict';

/**
 * Simple in-memory async cache for scraper responses.
 *
 * - TTL based
 * - Request coalescing (same key shares in-flight Promise)
 */

const store = new Map();

function now() {
  return Date.now();
}

function getCacheEntry(key) {
  const entry = store.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= now() && !entry.pending) {
    store.delete(key);
    return null;
  }

  return entry;
}

async function remember(key, ttlMs, loader) {
  const safeTtl = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 60_000;
  const current = getCacheEntry(key);

  if (current?.value !== undefined && current.expiresAt > now()) {
    return current.value;
  }

  if (current?.pending) {
    return current.pending;
  }

  const pending = Promise.resolve()
    .then(loader)
    .then((value) => {
      store.set(key, {
        value,
        expiresAt: now() + safeTtl,
        pending: null,
      });
      return value;
    })
    .catch((error) => {
      const latest = store.get(key);
      if (latest?.pending === pending) {
        store.delete(key);
      }
      throw error;
    });

  store.set(key, {
    value: current?.value,
    expiresAt: now() + safeTtl,
    pending,
  });

  return pending;
}

function clearByPrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

module.exports = {
  remember,
  clearByPrefix,
};
