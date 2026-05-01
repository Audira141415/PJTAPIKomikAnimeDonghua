'use strict';

const { getRedisClient } = require('@core/database/redis');
const telegram = require('@core/utils/telegram');
const logger = require('@core/utils/logger');

const PIN_PREFIX = 'shield:points:';
const BAN_PREFIX = 'shield:banned:';
const BAN_DURATION = parseInt(process.env.SHIELD_BAN_DURATION_SEC || '86400', 10); // 24h
const BAN_THRESHOLD = parseInt(process.env.SHIELD_BAN_THRESHOLD || '20', 10);

const shield = {
  /**
   * Check if an IP is currently banned
   */
  async isBanned(ip) {
    const redis = getRedisClient();
    if (!redis) return false;
    return (await redis.exists(`${BAN_PREFIX}${ip}`)) === 1;
  },

  /**
   * Add suspicion points to an IP. If threshold reached, ban it.
   */
  async addSuspicionPoints(ip, points, reason = 'Excessive suspicious behavior') {
    if (this.isWhitelisted(ip)) return;

    const redis = getRedisClient();
    if (!redis) return;

    const key = `${PIN_PREFIX}${ip}`;
    const newPoints = await redis.incrby(key, points);
    await redis.expire(key, 3600); // Reset suspicion every hour

    if (newPoints >= BAN_THRESHOLD) {
      await this.banIP(ip, `${reason} (Points: ${newPoints})`);
    } else {
      logger.warn(`[Shield] Suspicion points added to ${ip}`, { ip, points, total: newPoints, reason });
    }
  },

  /**
   * Instantly ban an IP
   */
  async banIP(ip, reason = 'Security violation') {
    if (this.isWhitelisted(ip)) return;

    const redis = getRedisClient();
    if (!redis) return;

    await redis.set(`${BAN_PREFIX}${ip}`, reason, 'EX', BAN_DURATION);
    await redis.del(`${PIN_PREFIX}${ip}`); // Clear points

    logger.error(`[Shield] BANNED IP ${ip} for ${reason}`);
    
    // Notify Admin via Telegram
    await telegram.sendAlert(
      'Smart Shield: IP Banned',
      `🚨 <b>Security Alert</b>\n\nBlocked IP: <code>${ip}</code>\nReason: <i>${reason}</i>\nDuration: <code>${BAN_DURATION / 3600} hours</code>`,
      'critical'
    );
  },

  /**
   * Whitelist localhost and local network
   */
  isWhitelisted(ip) {
    if (!ip) return true;
    
    // Normalize IP (remove ::ffff: prefix if present)
    const normalizedIp = ip.replace(/^::ffff:/, '');
    
    return (
      normalizedIp === '127.0.0.1' || 
      normalizedIp === '::1' || 
      normalizedIp === 'localhost' ||
      normalizedIp.startsWith('192.168.') || // Local network
      normalizedIp.startsWith('10.') ||      // Docker/Internal network
      normalizedIp.startsWith('172.')        // Docker network
    );
  }
};

module.exports = shield;
