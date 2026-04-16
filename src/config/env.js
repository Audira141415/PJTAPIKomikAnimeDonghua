const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  // Optional — if unset, cache layer is disabled (no-op)
  REDIS_URL: process.env.REDIS_URL || null,
  // Optional S3-compatible object storage — if unset, local disk upload is used
  S3_ENDPOINT: process.env.S3_ENDPOINT || null,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || null,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || null,
  S3_BUCKET: process.env.S3_BUCKET || null,
  S3_REGION: process.env.S3_REGION || 'auto',
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || null,  // Optional SMTP — if unset, emails are logged but not sent
  SMTP_HOST:   process.env.SMTP_HOST   || null,
  SMTP_PORT:   parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER:   process.env.SMTP_USER   || null,
  SMTP_PASS:   process.env.SMTP_PASS   || null,
  SMTP_FROM:   process.env.SMTP_FROM   || null,
  // App public URL — used in email links
  APP_URL: process.env.APP_URL || 'http://localhost:5000',
  // Site branding — returned in API responses
  APP_NAME: process.env.APP_NAME || 'Audira Comic API',
  SITE_CREATOR: process.env.SITE_CREATOR || 'Audira',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  CLIENT_USAGE_TRACKING_ENABLED: process.env.CLIENT_USAGE_TRACKING_ENABLED !== 'false',
  CLIENT_API_KEY_SALT_ROUNDS: parseInt(process.env.CLIENT_API_KEY_SALT_ROUNDS, 10) || 12,
};

const requiredVars = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'MONGO_URI'];
for (const key of requiredVars) {
  if (!env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = { env };
