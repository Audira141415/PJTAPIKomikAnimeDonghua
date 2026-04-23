const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const os = require('os');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');

const { env } = require('@core/config/env');
const swaggerSpec = require('@core/config/swagger').swaggerSpec;
const routes = require('./routes');
const { getRedisClient } = require('@core/database/redis');
const { errorHandler, notFound } = require('@middlewares/error.middleware');
const { apiLimiter, dashboardLimiter } = require('@middlewares/rateLimiter.middleware');
const { clientUsageTracker } = require('@middlewares/clientUsage.middleware');
const requestId = require('@middlewares/requestId.middleware').requestId;
const { pushActivity, getActivity, getMetrics } = require('@core/utils/dashboardMonitor');
const shieldMiddleware = require('@middlewares/shield.middleware');

const app = express();

if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// 1. Security Shield (IP Banning)
app.use(shieldMiddleware);

// Attach X-Request-ID to every request/response
app.use(requestId);

// Request activity tracking for dashboard live log
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path.startsWith('/dashboard') || req.path.startsWith('/favicon')) {
      return;
    }
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    const safePath = `${req.baseUrl || ''}${req.path || ''}` || req.originalUrl.split('?')[0];
    pushActivity({
      id: req.id,
      method: req.method,
      path: safePath,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  });
  next();
});

// Security headers
const appUrlProtocol = (() => {
  try {
    return new URL(env.APP_URL).protocol;
  } catch {
    return 'http:';
  }
})();
const isHttpsDeployment = appUrlProtocol === 'https:';
let helmetDirectives = helmet.contentSecurityPolicy.getDefaultDirectives();
helmetDirectives['script-src'] = ["'self'", "'unsafe-inline'"];
helmetDirectives['img-src'] = ["'self'", "data:", "https://images.unsplash.com", "https://*.unsplash.com", "http://192.168.100.158:3000", "https://192.168.100.158:3000", "http://uploads.mangadex.org", "https://uploads.mangadex.org", "https://*.wp.com", "https://*.anichin.cafe"];

if (env.NODE_ENV === 'production') {
  helmetDirectives['upgrade-insecure-requests'] = [];
}

if (!isHttpsDeployment) {
  // Avoid forcing HTTP deployments to fetch JS/CSS over HTTPS.
  helmetDirectives = Object.fromEntries(
    Object.entries(helmetDirectives).filter(([directive]) => (
      directive !== 'upgrade-insecure-requests' && directive !== 'upgradeInsecureRequests'
    ))
  );
}

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: helmetDirectives,
    },
    hsts: isHttpsDeployment,
  })
);

// CORS
const corsOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean);
if (corsOrigins.includes('*')) {
  throw new Error(
    'CORS_ORIGIN=* is incompatible with credentials:true. Set a specific origin (e.g. http://localhost:3000) instead.'
  );
}
app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
    credentials: true,
    exposedHeaders: ['X-Cache'],
  })
);

// Rate limiting
// Rate limiting disabled for debugging
// app.use('/api', apiLimiter);
app.use('/api', clientUsageTracker);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(process.cwd(), env.UPLOAD_DIR)));

// Landing page (endpoint explorer)
app.use(express.static(path.join(process.cwd(), 'client/admin-portal')));
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'client/admin-portal', 'index.html'));
});

// API documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: 'v1', timestamp: new Date().toISOString() });
});

// Rate limiting for dashboard telemetry endpoints
// Rate limiting disabled for debugging
// app.use('/dashboard', dashboardLimiter);

// Dashboard status for landing page widgets
app.get('/dashboard/status', async (req, res) => {
  const mongoStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const mongoReadyState = mongoose.connection.readyState;
  const mongoStatus = mongoStates[mongoReadyState] || 'unknown';

  const redisClient = getRedisClient();
  const redisEnabled = Boolean(env.REDIS_URL);
  const redisStatus = redisClient ? redisClient.status || 'initializing' : 'disabled';

  res.json({
    success: true,
    data: {
      server: {
        status: 'running',
        nodeEnv: env.NODE_ENV,
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      database: {
        provider: 'mongodb',
        connected: mongoReadyState === 1,
        state: mongoStatus,
      },
      cache: {
        provider: 'redis',
        enabled: redisEnabled,
        connected: redisStatus === 'ready',
        state: redisStatus,
      },
      system: {
        platform: os.platform(),
        memory: {
          usedMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
          totalMb: Math.round(os.totalmem() / (1024 * 1024)),
        },
      },
      metrics: getMetrics(),
    },
  });
});

// Dashboard live activity feed
app.get('/dashboard/activity', async (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10);
  const items = getActivity(limit);
  res.json({
    success: true,
    data: {
      total: items.length,
      items,
    },
  });
});

// API v1 routes
app.use('/api/v1', routes);

// Legacy redirect: /api/* (non-v1) → 410 Gone with migration hint
// Guard: if the path starts with /v1, it means a v1 route had no match — let
// the 404 handler below deal with it instead of returning a misleading 410.
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/v1')) return next();
  res.status(410).json({
    success: false,
    message: 'This API has been versioned. Please update your client to use /api/v1',
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
