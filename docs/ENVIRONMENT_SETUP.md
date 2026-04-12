# 📝 Panduan Konfigurasi Environment

## Overview
Dokumen ini menjelaskan semua environment variables yang diperlukan untuk menjalankan Audira Comic API di berbagai environment (development, staging, production).

---

## 1. Development Environment

### Setup Lokal

```bash
# 1. Copy template
cp .env.example .env.local

# 2. Generate JWT Secret (32+ karakter)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: aabbccdd...

# 3. Edit .env.local
```

### .env.local (Development)

```yaml
# Server Configuration
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/audira-dev
MONGODB_DEBUG=true

# Cache & Queue
REDIS_URL=redis://localhost:6379/0
REDIS_DEBUG=false

# Authentication
JWT_SECRET=your-generated-secret-key-here-min-32-chars
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173

# Email (Optional for development)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
EMAIL_FROM=noreply@audira-local

# Logging
LOG_LEVEL=debug
ENABLE_FILE_LOGGING=false

# API Rate Limiting
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=100
DASHBOARD_RATE_LIMIT_MAX=50

# Application
APP_NAME=Audira Comic API
APP_VERSION=1.0.0
APP_ENV=development
```

### Optional Services (Development)

```bash
# 1. MailHog (untuk testing email)
docker run -p 1025:1025 -p 8025:8025 mailhog/mailhog

# 2. MongoDB (Docker)
docker run -d -p 27017:27017 --name mongodb mongo:5

# 3. Redis (Docker)
docker run -d -p 6379:6379 --name redis redis:7
```

---

## 2. Staging Environment

### Platform: Railway / Vercel / AWS

### Environment Variables

```yaml
# Server
NODE_ENV=staging
PORT=3000

# Database - Staging MongoDB
MONGODB_URI=mongodb+srv://staging_user:staging_password@staging-cluster.mongodb.net/audira-staging?retryWrites=true&w=majority

# Cache
REDIS_URL=rediss://staging_user:password@redis-staging.railway.internal:6379/0
REDIS_PASSWORD=your-strong-password

# Authentication
JWT_SECRET=strong-staging-secret-min-32-characters-long-here
JWT_EXPIRE=7d

# CORS
CORS_ORIGIN=https://staging.audira.com,https://staging-frontend.audira.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=staging-email@gmail.com
SMTP_PASSWORD=app-password-from-gmail
EMAIL_FROM=staging@audira.com

# Logging & Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://xxx@sentry.io/staging-project-id
ENABLE_FILE_LOGGING=true
LOG_DIR=/app/logs

# API Configuration
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=100

# Database Connection Pool
DATABASE_POOL_SIZE=15
DATABASE_POOL_TIMEOUT=10000

# Cache TTL
CACHE_TTL_MANGA=3600
CACHE_TTL_ANIME=3600
CACHE_TTL_SEARCH=1800
```

### Secrets (Store in Platform Dashboard)

```
✅ MONGODB_URI
✅ REDIS_URL
✅ REDIS_PASSWORD
✅ JWT_SECRET
✅ SMTP_PASSWORD
✅ SENTRY_DSN
```

---

## 3. Production Environment

### CRITICAL: Security Requirements

- ✅ **NEVER** store secrets in code or `.env` file
- ✅ **ALWAYS** use platform's secure secret management
- ✅ **ROTATE** secrets every 90 days
- ✅ **AUDIT** secret access logs

### Production Environment Variables

```yaml
# Server
NODE_ENV=production
PORT=3000

# Database - Production MongoDB (High Availability)
MONGODB_URI=mongodb+srv://prod_admin:${DB_PASSWORD}@prod-cluster-0.mongodb.net/audira?retryWrites=true&w=majority&maxPoolSize=50&readPreference=secondaryPreferred
DB_PASSWORD=<use Railway/Vercel secret manager>

# Cache - Production Redis
REDIS_URL=rediss://:${REDIS_PASSWORD}@prod-redis.railway.internal:6379/0
REDIS_PASSWORD=<use Railway/Vercel secret manager>

# Authentication
JWT_SECRET=<generate 64+ character secret>
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# CORS - Production Origins Only
CORS_ORIGIN=https://audira.com,https://www.audira.com

# Email
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@audira.com
SMTP_PASSWORD=<mailgun password in secret manager>
EMAIL_FROM=noreply@audira.com

# Logging & Monitoring
LOG_LEVEL=warn
SENTRY_DSN=https://xxx@sentry.io/production-project-id
ENABLE_FILE_LOGGING=true
LOG_DIR=/app/logs

# New Relic (APM)
NEW_RELIC_ENABLED=true
NEW_RELIC_LICENSE_KEY=<license key>
NEW_RELIC_APP_NAME=audira-api-prod

# Security
ENABLE_HTTPS_REDIRECT=true
STRICT_SSL_VERIFY=true
HELMET_ENABLED=true

# API Configuration
API_RATE_LIMIT_WINDOW=15
API_RATE_LIMIT_MAX=50
DASHBOARD_RATE_LIMIT_MAX=20

# Database Connection Pool
DATABASE_POOL_SIZE=30
DATABASE_POOL_TIMEOUT=5000

# Cache TTL (Longer in production)
CACHE_TTL_MANGA=86400
CACHE_TTL_ANIME=86400
CACHE_TTL_SEARCH=3600
CACHE_TTL_USER=1800

# Backup & Recovery
BACKUP_ENABLED=true
BACKUP_FREQUENCY=daily
BACKUP_RETENTION_DAYS=30
```

### Production Secrets Checklist

```yaml
🔐 Required Secrets (NEVER in code):
  ✅ MONGODB_URI
  ✅ REDIS_URL
  ✅ REDIS_PASSWORD
  ✅ JWT_SECRET
  ✅ SMTP_PASSWORD
  ✅ SENTRY_DSN
  ✅ NEW_RELIC_LICENSE_KEY
  ✅ API_KEYS (untuk external services)
  ✅ STRIPE_SECRET_KEY (if payment enabled)
  ✅ AWS_ACCESS_KEY_ID
  ✅ AWS_SECRET_ACCESS_KEY
```

---

## 4. Environment Variable Setup by Platform

### Railway.app

```bash
# 1. Connect repository
# 2. Go to Project → Environment tab

# 3. Add variables:
NODE_ENV=production
JWT_SECRET=<your-secret>
MONGODB_URI=<use Railway's MongoDB plugin>
REDIS_URL=<use Railway's Redis plugin>

# 4. Deploy automatically
```

### Vercel

```bash
# 1. Connect Git repository
# 2. Go to Project → Settings → Environment Variables

# 3. Add variables:
# NodeJS_VERSION=18.17.0

# For specific environment:
# MONGODB_URI (Production): mongodb+srv://...
# MONGODB_URI (Preview): mongodb+srv://staging-...
# MONGODB_URI (Development): mongodb://localhost:27017/audira-dev
```

### AWS App Runner / EC2

```bash
# 1. Create .env.production file (locally, never in git):
NODE_ENV=production
MONGODB_URI=<uri>
REDIS_URL=<uri>
JWT_SECRET=<secret>

# 2. Use AWS Systems Manager Parameter Store:
aws ssm put-parameter --name audira_jwt_secret --value "<secret>" --type SecureString

# 3. Reference in code:
const jwtSecret = await getParameter('audira_jwt_secret');
```

### Docker Deployment

```bash
# Dockerfile should NOT contain secrets
# Instead, reference from --env-file or -e flags

# 1. Create .env.prod file:
NODE_ENV=production
# ... other vars

# 2. Run container with env file:
docker run --env-file .env.prod -p 3000:3000 audira-api:latest

# Or pass as environment variables:
docker run \
  -e NODE_ENV=production \
  -e JWT_SECRET=xxxxx \
  -e MONGODB_URI=xxxxx \
  -p 3000:3000 \
  audira-api:latest
```

---

## 5. Variable Reference Guide

### Core Variables

| Variable | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| `NODE_ENV` | string | ✅ | - | development \| staging \| production |
| `PORT` | number | ❌ | 3000 | Server port |
| `APP_NAME` | string | ❌ | Audira API | Application name |
| `APP_VERSION` | string | ❌ | 1.0.0 | Current version |

### Database Variables

| Variable | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| `MONGODB_URI` | string | ✅ | - | Connection string with auth |
| `DATABASE_POOL_SIZE` | number | ❌ | 10 | Connection pool size |
| `MONGODB_DEBUG` | boolean | ❌ | false | Enable debug logging |

### Cache & Queue Variables

| Variable | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| `REDIS_URL` | string | ✅ | - | Connection string |
| `REDIS_PASSWORD` | string | ❌ | - | If auth required |
| `REDIS_DEBUG` | boolean | ❌ | false | Enable debug |

### Authentication Variables

| Variable | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| `JWT_SECRET` | string | ✅ | - | Min 32 characters |
| `JWT_EXPIRE` | string | ❌ | 7d | Token expiration |
| `JWT_REFRESH_EXPIRE` | string | ❌ | 30d | Refresh token expiration |

### Email Variables

| Variable | Type | Required | Default | Notes |
|----------|------|----------|---------|-------|
| `SMTP_HOST` | string | ✅ | - | SMTP server host |
| `SMTP_PORT` | number | ✅ | 587 | SMTP port |
| `SMTP_USER` | string | ✅ | - | SMTP username |
| `SMTP_PASSWORD` | string | ✅ | - | SMTP password |
| `EMAIL_FROM` | string | ✅ | - | Sender email |

---

## 6. Validation Script

```javascript
// scripts/validate-env.js
const requiredVars = [
  'NODE_ENV',
  'MONGODB_URI',
  'REDIS_URL',
  'JWT_SECRET',
  'CORS_ORIGIN',
];

const missingVars = requiredVars.filter(
  (variable) => !process.env[variable]
);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach((variable) => console.error(`  - ${variable}`));
  process.exit(1);
}

// Validate JWT_SECRET length
if (process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

console.log('✅ All environment variables validated');
```

---

## 7. Troubleshooting

### "MONGODB_URI not set"
```bash
# Check .env file exists
ls -la .env.local

# Check variable is exported
echo $MONGODB_URI

# If using docker, make sure to pass -e flag
docker run -e MONGODB_URI=mongodb://... api
```

### "JWT_SECRET too short"
```bash
# Generate new secret (64 characters recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### "Redis connection failed"
```bash
# Test Redis connection
redis-cli -u $REDIS_URL ping

# If REDIS_PASSWORD set, use:
redis-cli -u rediss://:password@host:port ping
```

---

## 8. Secrets Rotation Guide

### Monthly Rotation Schedule

```bash
# 1. Generate new JWT_SECRET
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Update in platform (Railway/Vercel dashboard)
# Keep old tokens valid for 7 days

# 3. Rotate database password
# 4. Rotate SMTP password
# 5. Rotate API keys
```

---

## 📞 Need Help?

- Check `.env.example` untuk template
- Lihat logs untuk error details
- Review DEPLOYMENT_GUIDE.md untuk cara setup
- Contact: support@audira.com

---

**Last Updated:** 2026-04-12
