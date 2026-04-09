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

/**
 * Send a successful response.
 * @param {Response} res
 * @param {object}  opts
 * @param {number}  [opts.statusCode=200]
 * @param {*}       [opts.data=null]       - payload (object / array / null)
 * @param {*}       [opts.pagination=null] - pagination block (top-level)
 */
const success = (res, { statusCode = 200, data = null, pagination = null } = {}) => {
  return res.status(statusCode).json({
    status: 'success',
    creator: CREATOR,
    statusCode,
    statusMessage: STATUS_MESSAGES[statusCode] || 'OK',
    message: '',
    ok: true,
    data,
    pagination,
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
    status: 'success',
    creator: CREATOR,
    statusCode,
    statusMessage: STATUS_MESSAGES[statusCode] || 'Error',
    message,
    ok: false,
    data: null,
    pagination: null,
  });
};

module.exports = { success, error };

