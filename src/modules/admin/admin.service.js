'use strict';

const mongoose = require('mongoose');
const { Manga, RefreshToken, User } = require('../../models');
const cache = require('../../shared/utils/cache');

/**
 * Get audit statistics for data integrity
 */
const getAuditStats = async () => {
  const [total, missingTitle, missingCover, externalCovers, brokenDiscovery] = await Promise.all([
    Manga.countDocuments({}),
    Manga.countDocuments({ title: { $exists: false } }), // Also should check 'Unknown' if we want to be thorough
    Manga.countDocuments({ coverImage: { $exists: false } }),
    Manga.countDocuments({ coverImage: { $regex: /^http/ } }),
    Manga.countDocuments({
      $or: [
        { title: { $in: ['Unknown', 'unknown', 'null', 'Null', '', null] } },
        { coverImage: { $in: ['', null] } }
      ]
    })
  ]);

  return {
    total,
    missingTitle,
    missingCover,
    externalCovers,
    brokenDiscovery,
    qualityPercentage: total > 0 ? ((total - brokenDiscovery) / total * 100).toFixed(2) : 100
  };
};

/**
 * Selective Redis purge
 */
const purgeCache = async (pattern = '*') => {
  if (pattern === '*') {
    await cache.flush();
    return { message: 'Entire cache flushed' };
  }
  await cache.delPattern(pattern);
  return { message: `Cache purged with pattern: ${pattern}` };
};

/**
 * Clear redundant sessions
 */
const purgeSessions = async () => {
  // Clear expired refresh tokens
  const now = new Date();
  const result = await RefreshToken.deleteMany({ expires: { $lt: now } });
  return {
    deletedCount: result.deletedCount,
    message: 'Expired sessions cleared'
  };
};

/**
 * Bulk update metadata (example: cleanup unknown titles)
 */
const cleanupMetadata = async () => {
  // Not implemented yet, just a placeholder for dashboard action
  return { message: 'Metadata cleanup logic ready but not executed' };
};

module.exports = {
  getAuditStats,
  purgeCache,
  purgeSessions,
  cleanupMetadata,
};
