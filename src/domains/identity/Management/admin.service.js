'use strict';

const mongoose = require('mongoose');
const {              Manga, RefreshToken, User              } = require('@models');
const cache = require('@core/utils/cache');

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

/**
 * User Management
 */
const getUsers = async (query = {}) => {
  const filter = {};
  if (query.role) filter.role = query.role;
  if (query.search) {
    filter.$or = [
      { username: { $regex: query.search, $options: 'i' } },
      { email: { $regex: query.search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter)
    .select('-__v')
    .sort({ createdAt: -1 })
    .limit(100);

  return users;
};

const updateUserRole = async (userId, role) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  );
  if (!user) throw new Error('User not found');
  return user;
};

const deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new Error('User not found');
  return { id: userId };
};

module.exports = {
  getAuditStats,
  purgeCache,
  purgeSessions,
  cleanupMetadata,
  getUsers,
  updateUserRole,
  deleteUser,
};
