'use strict';

const { randomUUID } = require('crypto');
const { requestContext } = require('@core/config/context');

/**
 * Attaches a unique X-Request-ID to every request and response.
 * Downstream code can access it via `req.id`.
 * Also stores it in AsyncLocalStorage so the logger can read it
 * without needing req to be passed through the call stack.
 */
const requestId = (req, res, next) => {
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-ID', req.id);
  // Run the rest of the request inside a context that carries the request ID
  requestContext.run({ requestId: req.id }, next);
};

module.exports = { requestId };
