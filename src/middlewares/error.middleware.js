const { ZodError } = require('zod');
const ApiError = require('@core/errors/ApiError');
const logger = require('@core/utils/logger');
const { error: errorResponse } = require('@core/utils/response');
const shield = require('@core/utils/shield');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err instanceof ZodError) {
    statusCode = 400;
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    message = messages.join('; ');
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue).join(', ');
    message = `Duplicate value for: ${field}`;
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join('; ');
  }

  if (statusCode >= 500) {
    if (!err.isOperational) {
      // Programming/unexpected error — log full stack and flag as critical bug
      logger.error('CRITICAL unhandled error (non-operational):', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        requestId: req.id,
      });
    } else {
      logger.error('Operational 5xx error:', { message: err.message, requestId: req.id });
    }
  }

  const responseMessage =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : message;

  // --- Shield Logic: Track Suspicious Activity ---
  if (statusCode === 401) shield.addSuspicionPoints(req.ip, 2, 'Unauthorized access attempt');
  if (statusCode === 403) shield.addSuspicionPoints(req.ip, 5, 'Forbidden access attempt');

  errorResponse(res, { statusCode, message: responseMessage });
};

const notFound = (req, res) => {
  const path = req.originalUrl;
  
  // Track suspicion for 404s (potential probing)
  shield.addSuspicionPoints(req.ip, 1, `Route not found: ${path}`);
  
  errorResponse(res, { statusCode: 404, message: `Route not found: ${path}` });
};

module.exports = { errorHandler, notFound };
