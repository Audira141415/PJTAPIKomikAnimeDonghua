'use strict';

const mongoose = require('mongoose');
const logger = require('../config/logger');
const { env } = require('../config/env');
const clientUsageService = require('../modules/client-usage/clientUsage.service');

const HOSTNAME_PATTERN = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function extractDomain(headerValue) {
  if (!headerValue) return null;

  const raw = String(headerValue).trim();
  if (!raw || raw.length > 2048) return null;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname ? parsed.hostname.toLowerCase() : '';
    if (!host) return null;
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    const candidate = raw
      .split('/')[0]
      .split(':')[0]
      .toLowerCase()
      .replace(/^www\./, '');

    return HOSTNAME_PATTERN.test(candidate) ? candidate : null;
  }
}

function shouldSkipTracking(req) {
  if (!env.CLIENT_USAGE_TRACKING_ENABLED) return true;
  if (!req.path.startsWith('/v1/')) return true;
  if (req.path.startsWith('/v1/client-usage')) return true;
  if (req.path.startsWith('/v1/docs')) return true;
  return false;
}

const clientUsageTracker = (req, res, next) => {
  if (shouldSkipTracking(req)) {
    return next();
  }

  const start = process.hrtime.bigint();
  const rawApiKey = req.get('x-api-key') || '';
  const apiKey = rawApiKey.length <= 128 ? rawApiKey : '';
  const originDomain = extractDomain(req.get('origin'));
  const refererDomain = extractDomain(req.get('referer'));

  const resolutionPromise = clientUsageService
    .resolveClientFromRequest({
      apiKey,
      originDomain,
      refererDomain,
    })
    .catch((error) => {
      logger.warn('Client usage resolution failed', {
        message: error.message,
        path: req.originalUrl,
      });
      return { client: null, matchedBy: 'none' };
    });

  res.on('finish', () => {
    setImmediate(async () => {
      if (mongoose.connection.readyState !== 1) return;

      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;

      try {
        const resolved = await resolutionPromise;
        await clientUsageService.logRequestUsage({
          req,
          res,
          durationMs: Math.round(durationMs * 100) / 100,
          resolvedClient: resolved.client,
          matchedBy: resolved.matchedBy,
          originDomain,
          refererDomain,
        });
      } catch (error) {
        logger.warn('Client usage logging failed', {
          message: error.message,
          path: req.originalUrl,
          requestId: req.id,
        });
      }
    });
  });

  return next();
};

module.exports = { clientUsageTracker };
