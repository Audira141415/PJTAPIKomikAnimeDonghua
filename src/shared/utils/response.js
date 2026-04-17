'use strict';

const CREATOR = process.env.SITE_CREATOR || 'Audira';
const { env } = require('../../config/env');

const PROXY_DOMAIN_PATTERNS = [
  /mangadex\.org/i,
  /animepahe\./i,
  /pahe\./i,
  /hianime\./i,
  /aniwatch\./i,
  /akamaized\.net/i,
  /anichin\./i,
  /mangakatana\./i,
];

const PROXY_BASE_URL = `${env.APP_URL}/api/v1/image/proxy?url=`;

const wrapImageWithProxy = (url) => {
  if (!url || typeof url !== 'string' || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  // Convert local uploads path to absolute URL for the frontend
  if (url.startsWith('/uploads/')) {
    // Strip trailing slash from APP_URL just in case
    const baseUrl = env.APP_URL.replace(/\/$/, '');
    return `${baseUrl}${url}`;
  }

  // Already proxied or internal
  if (url.includes('/image/proxy')) return url;
  if (!url.startsWith('http')) return url;

  try {
    const hostname = new URL(url).hostname;
    const shouldProxy = PROXY_DOMAIN_PATTERNS.some((pattern) => pattern.test(hostname));
    if (shouldProxy) {
      const encoded = Buffer.from(url).toString('base64');
      return `${PROXY_BASE_URL}${encoded}`;
    }
  } catch {
    // Leave invalid URLs alone
  }
  return url;
};

const STATUS_MESSAGES = {
  200: 'OK',
  201: 'Created',
  204: 'No Content',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

const STATUS_ERROR_CODES = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'unprocessable_entity',
  429: 'too_many_requests',
  500: 'internal_server_error',
};

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

const normalizeCreator = (value, seen = new WeakSet()) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeCreator(item, seen));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date || Buffer.isBuffer(value)) {
    return value;
  }

  if (typeof value.toJSON === 'function' && !isPlainObject(value)) {
    return normalizeCreator(value.toJSON(), seen);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  if (seen.has(value)) {
    return value;
  }
  seen.add(value);

  const normalized = {};
  Object.keys(value).forEach((key) => {
    if (key === 'creator') {
      normalized[key] = CREATOR;
      return;
    }

    if (key === 'coverImage' || key === 'poster' || key === 'bannerImage' || key === 'image' || key === 'thumbnail' || (key === 'url' && (value.type === 'poster' || value.type === 'image'))) {
      normalized[key] = wrapImageWithProxy(value[key]);
      return;
    }

    // Deep handle arrays of images (like chapters or episode metadata)
    const val = value[key];
    if (Array.isArray(val) && (key === 'images' || key === 'episodeMetadata' || key === 'streamingEpisodes')) {
       normalized[key] = val.map(item => {
          if (typeof item === 'string') return wrapImageWithProxy(item);
          if (item && typeof item === 'object') {
             const newObj = { ...item };
             if (newObj.url) newObj.url = wrapImageWithProxy(newObj.url);
             if (newObj.image_url) newObj.image_url = wrapImageWithProxy(newObj.image_url);
             if (newObj.large_image_url) newObj.large_image_url = wrapImageWithProxy(newObj.large_image_url);
             if (newObj.thumbnail) newObj.thumbnail = wrapImageWithProxy(newObj.thumbnail);
             return newObj;
          }
          return item;
       });
       return;
    }

    normalized[key] = normalizeCreator(value[key], seen);
  });

  return normalized;
};

/**
 * Send a successful response.
 * @param {Response} res
 * @param {object}  opts
 * @param {number}  [opts.statusCode=200]
 * @param {*}       [opts.data=null]       - payload (object / array / null)
 * @param {*}       [opts.pagination=null] - pagination block (top-level)
 */
const success = (res, { statusCode = 200, data = null, pagination = null, message = '', meta = null } = {}) => {
  const metaValue = meta || pagination;
  return res.status(statusCode).json({
    status: 'success',
    success: true,
    error: null,
    meta: metaValue,
    data: normalizeCreator(data),
    message,
    ok: true,
    creator: CREATOR,
    statusCode,
    statusMessage: STATUS_MESSAGES[statusCode] || 'OK',
    pagination: metaValue,
  });
};

/**
 * Send an error response.
 * @param {Response} res
 * @param {object}  opts
 * @param {number}  [opts.statusCode=500]
 * @param {string}  [opts.message]
 */
const error = (res, { statusCode = 500, message = 'Internal Server Error' } = {}) => {
  return res.status(statusCode).json({
    status: 'error',
    success: false,
    error: {
      code: STATUS_ERROR_CODES[statusCode] || 'error',
      message,
      statusCode,
    },
    meta: null,
    data: null,
    message,
    ok: false,
    creator: CREATOR,
    statusCode,
    statusMessage: STATUS_MESSAGES[statusCode] || 'Error',
    pagination: null,
  });
};

module.exports = { success, error };

