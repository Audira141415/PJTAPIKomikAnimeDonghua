'use strict';

// Set required env vars before any module is loaded
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-32-chars-long!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-long!';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/comic-platform-test';
process.env.ACCESS_TOKEN_EXPIRY = '15m';
process.env.REFRESH_TOKEN_EXPIRY = '7d';

// Suppress logger output during tests
process.env.LOG_LEVEL = 'silent';
