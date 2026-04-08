'use strict';

const { AsyncLocalStorage } = require('async_hooks');

/**
 * Request-scoped async context store.
 * Populated by the requestId middleware on every incoming request.
 * The logger reads from this store to inject requestId into every log line
 * without needing to pass req through the call stack.
 */
const requestContext = new AsyncLocalStorage();

module.exports = { requestContext };
