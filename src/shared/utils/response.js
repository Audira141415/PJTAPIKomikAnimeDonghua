'use strict';

const CREATOR = process.env.SITE_CREATOR || 'Audira';

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

