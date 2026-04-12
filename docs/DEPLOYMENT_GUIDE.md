# Implementasi Next Steps - Production Deployment Guide

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Deployment Strategies](#deployment-strategies)
5. [Monitoring & Observability](#monitoring--observability)
6. [Rollback Procedures](#rollback-procedures)
7. [Performance Optimization](#performance-optimization)
8. [Security Hardening](#security-hardening)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (`npm test`)
- [ ] Coverage at 80%+ (`npm run test:coverage`)
- [ ] No linting errors (`npm run lint`)
- [ ] Security audit passed (`npm audit`)
- [ ] No hardcoded secrets in code

### Documentation
- [ ] README.md complete
- [ ] API documentation updated
- [ ] Environment variables documented
- [ ] Deployment guide created
- [ ] Incident response plan documented

### Infrastructure
- [ ] Database backups configured
- [ ] SSL/TLS certificates ready
- [ ] CDN configured (if needed)
- [ ] Load balancer configured
- [ ] Monitoring tools set up

### Testing
- [ ] Unit tests ✅
- [ ] Integration tests ✅
- [ ] E2E tests for critical flows ✅
- [ ] Performance testing done
- [ ] Security testing completed

---

## Environment Configuration

### Development (Local)
```bash
cp .env.example .env.local

# Edit .env.local
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/audira-dev
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=dev-secret-key-change-in-production
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
LOG_LEVEL=debug
```

### Staging Environment
```bash
# Set environment variables in hosting platform (Railway, Vercel, AWS)
NODE_ENV=staging
PORT=3000
MONGODB_URI=<staging-mongodb-uri>
REDIS_URL=<staging-redis-uri>
JWT_SECRET=<strong-staging-secret>
CORS_ORIGIN=https://staging.audira.com
LOG_LEVEL=info
```

### Production Environment
```bash
# CRITICAL: Set in hosting platform ONLY, never in code
NODE_ENV=production
PORT=3000
MONGODB_URI=<prod-mongodb-uri-with-auth>
REDIS_URL=<prod-redis-uri-with-auth>
JWT_SECRET=<very-strong-prod-secret>
REDIS_PASSWORD=<strong-password>
CORS_ORIGIN=https://audira.com
LOG_LEVEL=warn

# Optional
SENTRY_DSN=https://xxx@sentry.io/project-id
NEW_RELIC_LICENSE_KEY=xxx
DATABASE_POOL_SIZE=20
```

### Environment Variables Schema

```yaml
# Authentication
JWT_SECRET: required, minimum 32 characters
JWT_EXPIRE: default "7d"

# Database
MONGODB_URI: required, connection string with credentials
DATABASE_POOL_SIZE: optional, default 10

# Cache
REDIS_URL: required
REDIS_PASSWORD: optional

# Server
PORT: default 3000
NODE_ENV: development|staging|production

# CORS
CORS_ORIGIN: comma-separated origins

# Email (if enabled)
SMTP_HOST: required
SMTP_PORT: required
SMTP_USER: required
SMTP_PASSWORD: required
EMAIL_FROM: required

# Logging & Monitoring
LOG_LEVEL: debug|info|warn|error
SENTRY_DSN: optional

# API Rate Limiting
API_RATE_LIMIT_WINDOW: default 15 minutes
API_RATE_LIMIT_MAX: default 100
```

---

## Database Setup

### MongoDB Production Setup

#### Atlas (Recommended for cloud)
```bash
# 1. Create cluster at mongodb.com/cloud
# 2. Configure auth and network access
# 3. Get connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/audira?retryWrites=true&w=majority

# 4. Index optimization
db.mangas.createIndex({ "title": "text", "description": "text" })
db.episodes.createIndex({ "anime": 1, "episodeNumber": 1 })
db.chapters.createIndex({ "manga": 1, "chapterNumber": 1 })
db.users.createIndex({ "email": 1 }, { unique: true })
```

#### Self-Hosted (Advanced)
```bash
# Use MongoDB Community Edition with:
# - Replica sets (for HA)
# - Authentication enabled
# - Encryption at rest
# - Regular backups
```

### Backup Strategy

```bash
# Daily backup (automated)
mongodump --uri="mongodb+srv://username:password@cluster.mongodb.net/audira" \
  --archive=audira-backup-$(date +%Y%m%d).archive

# Weekly backup to S3
aws s3 cp audira-backup-*.archive s3://backups/audira/
```

---

## Deployment Strategies

### Option 1: Railway (Recommended for MVP)

1. **Connect Repository**
```bash
git push origin main  # Railway auto-deploys
```

2. **Configure Environment**
   - Set environment variables in Railway dashboard
   - Add MongoDB and Redis plugins
   - Configure custom domain

3. **Monitor Deployment**
   - Check logs in Railway dashboard
   - Set up alerts for errors

### Option 2: Docker + DigitalOcean/AWS

```dockerfile
# Build
docker build -t audira-api:1.0.0 .

# Push to registry
docker tag audira-api:1.0.0 registry.digitalocean.com/audira-api:1.0.0
docker push registry.digitalocean.com/audira-api:1.0.0

# Deploy with Kubernetes or Docker Swarm
kubectl apply -f deployment.yaml
```

### Option 3: PM2 + Ubuntu Server

```bash
# 1. Install PM2
npm install -g pm2

# 2. Start application
pm2 start src/server.js --name audira-api --instances max

# 3. Enable auto-start on reboot
pm2 startup
pm2 save

# 4. Monitor
pm2 monit
pm2 logs audira-api
```

---

## Monitoring & Observability

### Health Checks

```javascript
// GET /health
{
  "status": "healthy",
  "timestamp": "2026-04-12T10:00:00Z",
  "version": "1.0.0",
  "database": "connected",
  "redis": "connected",
  "uptime": 86400000  // milliseconds
}
```

### Error Tracking (Sentry)

```bash
# Install
npm install @sentry/node

# Configure in app.js
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### Application Performance Monitoring

```bash
# New Relic
npm install newrelic

# DataDog
npm install dd-trace
```

### Logging

```bash
# Centralized logging
npm install winston
npm install winston-elasticsearch

# Logs to:
# - Console (development)
# - File (production)
# - Elasticsearch (centralized)
```

---

## Rollback Procedures

### Quick Rollback (Last Version)
```bash
# If using Railway
# 1. Click "Rollback" button in dashboard
# 2. Or revert git commit: git revert HEAD
# 3. Push to main branch

# If using Docker
docker service update --image registry/audira:previous-version audira-api
```

### Database Rollback
```bash
# Restore from backup
mongorestore --uri="mongodb+srv://..." --archive=backup.archive

# Or point read replica to previous checkpoint
```

---

## Performance Optimization

### Database Optimization

```javascript
// 1. Create indexes
db.mangas.createIndex({ "slug": 1 })
db.chapters.createIndex({ "manga": 1, "chapterNumber": 1 })

// 2. Query optimization
// Use .lean() for read-only queries
Manga.find().lean().exec()

// 3. Projection to reduce document size
Manga.find({}, { title: 1, slug: 1, cover: 1 })
```

### Caching Strategy

```javascript
// Redis caching
// 1. Cache popular mangas (1 hour TTL)
// 2. Cache search results (30 minutes TTL)
// 3. Cache user preferences (24 hours TTL)

// Implement cache invalidation on updates
```

### API Response Optimization

```javascript
// 1. Pagination for large datasets (default 20 items)
// 2. Compression (gzip enabled in Express)
// 3. CDN for static assets
// 4. Lazy loading for images
```

---

## Security Hardening

### HTTPS Enforcement
```bash
# Auto-redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### Rate Limiting in Production
```javascript
// Stricter limits in production
const apiLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 100,
});
```

### CORS in Production
```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
```

### Secrets Rotation
```bash
# Quarterly secret rotation
# 1. Generate new JWT_SECRET
# 2. Deploy with new secret (old tokens still valid for 7 days)
# 3. Update database credentials
# 4. Update API keys
```

---

## Post-Deployment

### Day 1 Testing
- [ ] Health check passing
- [ ] API endpoints responding
- [ ] Database queries working
- [ ] Cache working
- [ ] Email notifications sending

### Week 1 Monitoring
- [ ] Error rates normal
- [ ] Response times acceptable
- [ ] Database performance good
- [ ] No unexpected disconnections
- [ ] User feedback positive

### Monthly Review
- [ ] Analytics review
- [ ] Performance metrics
- [ ] Security incidents (if any)
- [ ] Cost optimization
- [ ] Feature requests

---

## Emergency Contacts

```
🚨 If Production is Down:

1. Check hosting platform status
2. Check database status
3. Check logs for errors
4. Restart application might help
5. If all else fails, trigger rollback

Contact:
- DevOps Lead: [slack/email]
- Security Lead: [slack/email]
- Database Admin: [slack/email]
```

---

**Last Updated:** 2026-04-12
**Next Review:** 2026-05-12
