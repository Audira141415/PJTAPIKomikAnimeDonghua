'use strict';

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const {            ClientApp            } = require('@models');
const {            UsageLog            } = require('@models');
const ApiError = require('@core/errors/ApiError');
const { env } = require('@core/config/env');

const UNKNOWN_DOMAIN = 'unknown';

const isDbReady = () => mongoose.connection.readyState === 1;

function normalizeDomain(value) {
  if (!value) return null;
  const input = String(value).trim().toLowerCase();
  if (!input) return null;

  let host = input;
  try {
    const parsed = new URL(input.startsWith('http') ? input : `https://${input}`);
    host = parsed.hostname.toLowerCase();
  } catch {
    host = input.split('/')[0].split(':')[0].toLowerCase();
  }

  if (host.startsWith('www.')) {
    host = host.slice(4);
  }

  if (!host || host.includes(' ')) return null;
  return host;
}

function maskIpAddress(rawIp) {
  const ip = String(rawIp || '').trim();
  if (!ip) return '';

  if (ip.includes('.')) {
    const chunks = ip.split('.');
    if (chunks.length === 4) {
      return `${chunks[0]}.${chunks[1]}.${chunks[2]}.0`;
    }
  }

  if (ip.includes(':')) {
    const chunks = ip.split(':');
    if (chunks.length > 2) {
      return `${chunks.slice(0, 4).join(':')}::`;
    }
  }

  return ip;
}

function buildSafePath(req) {
  const base = req.baseUrl || '';
  const path = req.path || '';
  const combined = `${base}${path}`.trim();
  if (combined) return combined;
  return String(req.originalUrl || '/').split('?')[0] || '/';
}

function generateApiKey() {
  return crypto.randomBytes(32).toString('hex');
}

function toClientResponse(client) {
  const value = client.toObject ? client.toObject() : { ...client };
  delete value.apiKeyHash;
  return value;
}

async function createClientApp({ name, domain, createdBy = null }) {
  const normalizedDomain = normalizeDomain(domain);
  if (!normalizedDomain) {
    throw new ApiError(400, 'Invalid domain format');
  }

  const existing = await ClientApp.findOne({ domain: normalizedDomain }).lean();
  if (existing) {
    throw new ApiError(409, 'Domain is already registered');
  }

  const apiKey = generateApiKey();
  const apiKeyPrefix = apiKey.slice(0, 12);
  const apiKeyHint = apiKey.slice(-6);
  const rounds = Number.isFinite(env.CLIENT_API_KEY_SALT_ROUNDS) ? env.CLIENT_API_KEY_SALT_ROUNDS : 12;
  const apiKeyHash = await bcrypt.hash(apiKey, rounds);

  const client = await ClientApp.create({
    name: String(name).trim(),
    domain: normalizedDomain,
    apiKeyHash,
    apiKeyPrefix,
    apiKeyHint,
    createdBy: createdBy ? String(createdBy) : null,
  });

  return {
    client: toClientResponse(client),
    apiKey,
  };
}

async function listClientApps({ page = 1, limit = 20, status }) {
  const query = status ? { status } : {};
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    ClientApp.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ClientApp.countDocuments(query),
  ]);

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

async function getClientAppById(clientId) {
  const client = await ClientApp.findById(clientId).lean();
  if (!client) {
    throw new ApiError(404, 'Client app not found');
  }
  return client;
}

async function updateClientApp(clientId, payload) {
  const update = {};

  if (payload.name !== undefined) {
    update.name = String(payload.name).trim();
  }
  if (payload.domain !== undefined) {
    const normalized = normalizeDomain(payload.domain);
    if (!normalized) {
      throw new ApiError(400, 'Invalid domain format');
    }
    update.domain = normalized;
  }
  if (payload.status !== undefined) {
    update.status = payload.status;
  }

  const updated = await ClientApp.findByIdAndUpdate(
    clientId,
    { $set: update },
    { new: true, runValidators: true }
  ).lean();

  if (!updated) {
    throw new ApiError(404, 'Client app not found');
  }

  return updated;
}

async function rotateApiKey(clientId) {
  const client = await ClientApp.findById(clientId).select('+apiKeyHash');
  if (!client) {
    throw new ApiError(404, 'Client app not found');
  }

  const newApiKey = generateApiKey();
  const rounds = Number.isFinite(env.CLIENT_API_KEY_SALT_ROUNDS) ? env.CLIENT_API_KEY_SALT_ROUNDS : 12;
  client.apiKeyHash = await bcrypt.hash(newApiKey, rounds);
  client.apiKeyPrefix = newApiKey.slice(0, 12);
  client.apiKeyHint = newApiKey.slice(-6);
  await client.save();

  return {
    client: toClientResponse(client),
    apiKey: newApiKey,
  };
}

async function resolveClientFromRequest({ apiKey, originDomain, refererDomain }) {
  if (!isDbReady()) {
    return { client: null, matchedBy: 'none' };
  }

  const cleanApiKey = String(apiKey || '').trim();
  const normalizedOrigin = normalizeDomain(originDomain);
  const normalizedReferer = normalizeDomain(refererDomain);

  if (cleanApiKey) {
    const prefix = cleanApiKey.slice(0, 12);
    const candidates = await ClientApp.find({
      apiKeyPrefix: prefix,
      status: 'active',
    }).select('+apiKeyHash');

    let matchedCandidate = null;

    for (const candidate of candidates) {
      try {
        const valid = await bcrypt.compare(cleanApiKey, candidate.apiKeyHash);
        if (valid && !matchedCandidate) {
          matchedCandidate = candidate;
        }
      } catch {
        // Keep validating remaining candidates so one corrupted hash does not block auth.
      }
    }

    if (matchedCandidate) {
      return {
        client: toClientResponse(matchedCandidate),
        matchedBy: 'api-key',
      };
    }
  }

  if (normalizedOrigin) {
    const byOrigin = await ClientApp.findOne({ domain: normalizedOrigin, status: 'active' }).lean();
    if (byOrigin) {
      return { client: byOrigin, matchedBy: 'origin' };
    }
  }

  if (normalizedReferer) {
    const byReferer = await ClientApp.findOne({ domain: normalizedReferer, status: 'active' }).lean();
    if (byReferer) {
      return { client: byReferer, matchedBy: 'referer' };
    }
  }

  return { client: null, matchedBy: 'none' };
}

async function logRequestUsage({ req, res, durationMs = null, resolvedClient, matchedBy, originDomain, refererDomain }) {
  if (!isDbReady()) {
    return;
  }

  const normalizedOrigin = normalizeDomain(originDomain);
  const normalizedReferer = normalizeDomain(refererDomain);
  const domain = normalizedOrigin || normalizedReferer || UNKNOWN_DOMAIN;
  const now = new Date();

  await UsageLog.create({
    clientApp: resolvedClient?._id || null,
    domain,
    originDomain: normalizedOrigin,
    refererDomain: normalizedReferer,
    matchedBy,
    path: buildSafePath(req),
    method: req.method,
    statusCode: res.statusCode,
    durationMs,
    requestId: req.id || null,
    userAgent: String(req.get('user-agent') || '').slice(0, 256),
    ipAddress: maskIpAddress(req.ip),
    day: now.toISOString().slice(0, 10),
    createdAt: now,
  });

  if (resolvedClient?._id) {
    await ClientApp.updateOne(
      { _id: resolvedClient._id },
      {
        $set: { lastUsedAt: now },
        $inc: { totalRequests: 1 },
      }
    );
  }
}

async function getTopWebsites({ days = 30, limit = 10 }) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return await UsageLog.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$domain',
          requestCount: { $sum: 1 },
          successCount: {
            $sum: {
              $cond: [{ $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 400] }] }, 1, 0],
            },
          },
          failedCount: {
            $sum: {
              $cond: [{ $gte: ['$statusCode', 400] }, 1, 0],
            },
          },
          lastSeenAt: { $max: '$createdAt' },
          uniqueClients: { $addToSet: '$clientApp' },
        },
      },
      {
        $project: {
          _id: 0,
          domain: '$_id',
          requestCount: 1,
          successCount: 1,
          failedCount: 1,
          lastSeenAt: 1,
          uniqueClients: {
            $size: {
              $filter: {
                input: '$uniqueClients',
                as: 'value',
                cond: { $ne: ['$$value', null] },
              },
            },
          },
        },
      },
      { $sort: { requestCount: -1, domain: 1 } },
      { $limit: limit },
    ]).maxTimeMS(4000).allowDiskUse(true);
  } catch (err) {
    console.error('Error in getTopWebsites:', err);
    return [];
  }
}

async function getDailyDomainUsage({ days = 30, domain = null, limit = 200 }) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const normalizedDomain = normalizeDomain(domain);
  const match = normalizedDomain
    ? { createdAt: { $gte: since }, domain: normalizedDomain }
    : { createdAt: { $gte: since } };

  return UsageLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: { day: '$day', domain: '$domain' },
        requestCount: { $sum: 1 },
        uniqueClients: { $addToSet: '$clientApp' },
      },
    },
    {
      $project: {
        _id: 0,
        day: '$_id.day',
        domain: '$_id.domain',
        requestCount: 1,
        uniqueClients: {
          $size: {
            $filter: {
              input: '$uniqueClients',
              as: 'value',
              cond: { $ne: ['$$value', null] },
            },
          },
        },
      },
    },
    { $sort: { day: -1, requestCount: -1, domain: 1 } },
    { $limit: limit },
  ]).maxTimeMS(5000);
}

async function getDashboardSummary({ days = 7, includeUnknown = true }) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const baseMatch = includeUnknown
      ? { createdAt: { $gte: since } }
      : { createdAt: { $gte: since }, domain: { $ne: UNKNOWN_DOMAIN } };

    const [dailyTotals, topWebsites, totalRequests, activeClients] = await Promise.all([
      UsageLog.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$day', requestCount: { $sum: 1 } } },
        {
          $project: {
            _id: 0,
            day: '$_id',
            requestCount: 1,
          },
        },
        { $sort: { day: 1 } },
      ]).maxTimeMS(4000).allowDiskUse(true),
      getTopWebsites({ days, limit: 5 }),
      UsageLog.countDocuments(baseMatch),
      ClientApp.countDocuments({ status: 'active' }),
    ]);

    return {
      periodDays: days,
      totalRequests,
      activeClients,
      dailyTotals,
      topWebsites,
    };
  } catch (err) {
    console.error('CRITICAL: Dashboard analytics failed:', err);
    // Return graceful fallback instead of letting the whole request fail with 500
    return {
      periodDays: days,
      totalRequests: 0,
      activeClients: 0,
      dailyTotals: [],
      topWebsites: [],
      error: 'Analytics temporarily unavailable'
    };
  }
}

module.exports = {
  UNKNOWN_DOMAIN,
  normalizeDomain,
  createClientApp,
  listClientApps,
  getClientAppById,
  updateClientApp,
  rotateApiKey,
  resolveClientFromRequest,
  logRequestUsage,
  getTopWebsites,
  getDailyDomainUsage,
  getDashboardSummary,
};
