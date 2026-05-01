'use strict';

const shield = require('@core/utils/shield');
const logger = require('@core/utils/logger');

/**
 * Malicious patterns often used by bots to probe for vulnerabilities
 */
const MALICIOUS_PATTERNS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/\.well-known/i,
  /\.php$/i,
  /\.asp$/i,
  /\.aspx$/i,
  /wp-admin/i,
  /wp-login/i,
  /config\/env/i,
  /config\/db/i,
  /scripts\/research/i // Hide our own research scripts
];

const shieldMiddleware = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;

  // 0. Whitelist bypass
  if (shield.isWhitelisted(ip)) {
    return next();
  }

  // 1. Check if BANNED
  if (await shield.isBanned(ip)) {
    // Silence is golden — abort immediately without much info
    return res.status(403).json({
      success: false,
      message: 'Access denied for security reasons.'
    });
  }

  // 2. Proactive Probe Detection
  const path = req.path;
  const isMalicious = MALICIOUS_PATTERNS.some(pattern => pattern.test(path));

  if (isMalicious) {
    logger.warn(`[Shield] Malicious probe detected from ${ip} -> ${path}`);
    // Instant ban for high-risk probes
    await shield.banIP(ip, `Immediate ban: probing sensitive path ${path}`);
    return res.status(403).json({
      success: false,
      message: 'Security violation detected.'
    });
  }

  next();
};

module.exports = shieldMiddleware;
