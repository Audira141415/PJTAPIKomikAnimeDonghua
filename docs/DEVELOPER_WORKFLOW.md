# 📋 Developer Workflow Guide

Complete walkthrough for developing, testing, and deploying Audira Comic API.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Development Workflow](#2-development-workflow)
3. [Testing Workflow](#3-testing-workflow)
4. [Security & Quality Checks](#4-security--quality-checks)
5. [Staging Deployment](#5-staging-deployment)
6. [Production Deployment](#6-production-deployment)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Local Development Setup

### Prerequisites

```bash
Node.js 18+ ✅
MongoDB 5+ ✅
Redis 7+ ✅
npm or yarn ✅
```

### Initial Setup (First Time)

```bash
# 1. Clone repository
git clone https://github.com/your-org/audira-api.git
cd audira-api

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local

# 4. Edit .env.local with your local values (use provided ENVIRONMENT_SETUP.md as reference)
# - MONGODB_URI=mongodb://localhost:27017/audira-dev
# - REDIS_URL=redis://localhost:6379/0
# - JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
# - CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# 5. Start services (Docker or local)
docker-compose up -d    # MongoDB + Redis
# OR
# Start MongoDB and Redis manually

# 6. Run migrations & seed (optional)
npm run seed            # Populate sample data

# 7. Start development server
npm run dev
# Server running at: http://localhost:3000
# API Docs: http://localhost:3000/api-docs
```

### Verify Setup

```bash
# Test database connection
npm run test -- --testNamePattern="database connection"

# Test API health
curl http://localhost:3000/health

# Test Redis
npm run redis:ping

# View logs
npm run logs:follow
```

---

## 2. Development Workflow

### Working on a Feature

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# 2. Make changes following style guide
# - Read: CODING_STYLE.md (from rules/)
# - Keep functions <50 lines
# - Immutable patterns only
# - Clear error handling

# 3. Validate syntax & format
npm run lint              # ESLint
npm run format            # Prettier (auto-fix)
npm run typecheck        # Type checking

# 4. Write tests BEFORE implementing
# - See Testing Workflow section below
```

### Committing Code

```bash
# 1. Stage changes
git add .

# 2. Commit with descriptive message (conventional commits)
git commit -m "feat: add advanced search with filters"
# Format: <type>: <description>
# Types: feat, fix, refactor, docs, test, chore, perf, ci

# 3. Push to remote
git push origin feature/your-feature-name

# 4. Create Pull Request on GitHub
# - Link related issues
# - Add description & screenshots
# - Request 2 reviewers
```

### Code Review Process

```
Your PR → GitHub Actions Tests → Code Review → Merge
                ↓                      ↓
         All tests must pass    Requires 2 approvals
```

---

## 3. Testing Workflow

### Test-Driven Development (TDD)

```bash
# 1. Write failing test first
npm run test -- --watch

# In test file:
describe('User Service', () => {
  test('should create user with valid email', async () => {
    const user = await UserService.create({
      email: 'test@example.com',
      password: 'SecurePass123!',
    });
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
  });
});

# 2. Test fails (RED phase)
# 3. Implement function to pass test (GREEN phase)
# 4. Refactor if needed (REFACTOR phase)
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage
# Output: coverage/lcov-report/index.html (open in browser)

# Watch mode (re-run on file changes)
npm run test -- --watch

# Run specific test file
npm run test -- tests/unit/services/auth.service.test.js

# Run specific test suite
npm run test -- --testNamePattern="Auth Service"

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Using Test Utilities

```javascript
// Located in tests/helpers/

// 1. Mock Data Generation (TestFactory)
const { TestFactory, TestUtils } = require('../../helpers');

const user = TestFactory.createUser({
  email: 'custom@test.com',
});

const manga = TestFactory.createManga({
  title: 'Test Manga',
});

// 2. Database Utilities (TestUtils)
beforeAll(async () => {
  await TestUtils.connectDB();
});

afterEach(async () => {
  await TestUtils.clearDB();
});

afterAll(async () => {
  await TestUtils.disconnectDB();
});

// 3. Seed Test Data
await TestUtils.seedUsers(10);
await TestUtils.seedManga(20);

// 4. Response Validation
expect(response).toBeDefined();
expect(response.statusCode).toBe(200);
expect(response.body.data).toBeDefined();

// 5. Pagination Testing
const pageParams = { page: 1, limit: 10 };
const response = await request.get(`/api/manga?page=${pageParams.page}&limit=${pageParams.limit}`);
expect(response.body.pagination.page).toBe(1);
```

### Coverage Requirements

```yaml
Minimum Coverage Thresholds (jest.config.js):
- Lines covered: 80%
- Statements: 80%
- Functions: 75%
- Branches: 60%

To check coverage:
npm run test:coverage
# View detailed report:
open coverage/lcov-report/index.html
```

---

## 4. Security & Quality Checks

### Pre-Commit Checks

```bash
# Run before staging
npm run validate    # Runs: lint, type-check, test

# Or individually:
npm run lint        # ESLint check
npm run format      # Prettier format
npm run typecheck   # TypeScript/JSDoc check
npm audit           # Dependency vulnerabilities
npm run security:audit  # OWASP security scan
```

### Local Security Audit

```bash
# 1. Check for hardcoded secrets
npm run security:audit

# 2. Validate environment variables
npm run validate:env

# 3. Run OWASP dependency check
npm audit --audit-level=moderate

# 4. Check code for security issues
npm run lint:security
```

### Security Checklist Before Committing

```yaml
✅ No hardcoded API keys or passwords
✅ All user inputs validated (use validation middleware)
✅ SQL/NoSQL injection prevention verified
✅ Authentication/authorization enforced
✅ Rate limiting applied where needed
✅ CORS properly configured
✅ HTTPS enforced in production
✅ Error messages don't leak sensitive data
✅ Logging doesn't capture secrets
```

---

## 5. Staging Deployment

### Prerequisites

```
✅ GitHub secrets configured (see GITHUB_SECRETS_SETUP.md)
✅ Railway project created
✅ Staging MongoDB & Redis provisioned
✅ Slack webhook configured (optional)
```

### Deploy to Staging

```bash
# 1. Create pull request to main branch
git push origin feature/your-feature

# 2. GitHub Actions automatically:
#    ✅ Runs linting
#    ✅ Runs unit tests
#    ✅ Runs integration tests
#    ✅ Builds Docker image
#    ✅ Deploys to staging

# 3. Verify staging deployment
# Check Slack notification ✅
# Test API: https://staging-api.audira.com/health

# 4. Run staging smoke tests
curl https://staging-api.audira.com/health
curl https://staging-api.audira.com/api/manga

# 5. QA Testing on Staging
# Use Postman collection or frontend
# Test all critical flows
```

### Monitor Staging

```bash
# 1. View logs
# Railway dashboard → Staging env → Logs tab

# 2. Monitor performance
# Sentry dashboard → staging project
# Check response times, errors

# 3. Database queries
# MongoDB Atlas → staging cluster
# Check indices, slow queries

# 4. Check metrics
# New Relic / DataDog dashboard
```

### Rollback from Staging

```bash
# If deployment fails on staging:
# 1. Automatic rollback triggers on smoke test failure
# 2. Manual rollback:
git revert <commit-hash>
git push origin main
# This triggers automatic redeployment to staging
```

---

## 6. Production Deployment

### Pre-Production Checklist

```yaml
✅ All tests passing (100% check)
✅ Code review approved (2+ reviewers)
✅ Security scan passed (0 high/critical vulnerabilities)
✅ Performance tested (response time < 200ms)
✅ Database migration tested
✅ Backup verified
✅ Monitoring configured
✅ Runbook created
✅ Team notified
```

### Deploy to Production

```bash
# 1. Merge to main branch
git checkout main
git pull origin main
# OR merge PR on GitHub

# 2. GitHub Actions triggers automatically:
#    ✅ All tests run
#    ✅ Security checks pass
#    ✅ Docker image built
#    ✅ Container pushed to registry
#    ✅ PENDING: Manual approval for production

# 3. Approve production deployment
# Go to GitHub Actions workflow
# Click "Review Deployments"
# Approve for production environment

# 4. Deployment continues:
#    ✅ Container deployed to production
#    ✅ Health checks verify
#    ✅ Smoke tests run
#    ✅ Slack notification sent

# 5. Verify production
curl https://api.audira.com/health
# Should respond with { status: 'ok', ... }
```

### Post-Production Monitoring

```bash
# Monitor for 1 hour after deployment:

# 1. Error Tracking
# Sentry dashboard → check for new errors
# Expected: 0 critical errors

# 2. Performance
# New Relic → Response times
# Expected: p95 < 500ms, p99 < 1000ms

# 3. Database Queries
# MongoDB Atlas → slow query log
# Expected: No queries > 100ms without index

# 4. User Activity
# Dashboard → Active users
# Expected: Normal traffic patterns

# 5. Notifications
# Check Slack #alerts channel
# Expected: No critical alerts
```

### Production Rollback Procedure

```bash
# If issues discovered in production:

# CRITICAL ISSUE (>1% error rate):
# 1. Immediate rollback
git revert <commit-hash>
git push origin main
# GitHub Actions automatically redeploys previous version
# Expected: Back to previous working state in 5-10 minutes

# MINOR ISSUE (<1% error rate):
# 1. Hotfix on separate branch
git checkout -b hotfix/critical-bug
# ... fix the issue
git push origin hotfix/critical-bug
# 2. Create pull request → get approval → merge
# 3. Automatic deployment triggers again

# POST-ROLLBACK:
# - Check Slack notification
# - Verify error rate returned to normal
# - Schedule post-mortem meeting
# - Document incident
```

---

## 7. Troubleshooting

### Common Issues & Solutions

#### MongoDB Connection Error

```bash
❌ Error: ECONNREFUSED 127.0.0.1:27017

# Solution 1: Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:5

# Solution 2: Check existing connection
lsof -ti:27017 | xargs kill -9
docker start mongodb

# Solution 3: Verify connection string
echo $MONGODB_URI  # Should print valid URI
```

#### Redis Connection Error

```bash
❌ Error: ECONNREFUSED 127.0.0.1:6379

# Solution 1: Start Redis
docker run -d -p 6379:6379 --name redis redis:7

# Solution 2: Test Redis
redis-cli ping  # Should return PONG

# Solution 3: Check Redis URL in .env.local
grep REDIS_URL .env.local
```

#### Tests Failing Locally

```bash
# 1. Clear test database and cache
npm run test --  --clearCache

# 2. Run with debug output
DEBUG=* npm test

# 3. Run specific test file
npm test -- tests/unit/services/auth.service.test.js

# 4. Check test helpers are imported correctly
# See tests/helpers/index.js

# 5. Reset node modules (last resort)
rm -rf node_modules package-lock.json
npm install
npm test
```

#### Linting Errors

```bash
❌ Error: 1 error in src/services/user.service.js

# Solution 1: Auto-fix issues
npm run format    # Prettier auto-fixes
npm run lint -- --fix  # ESLint auto-fixes

# Solution 2: Manual fixes for complex issues
# Edit file and fix manually

# Solution 3: Check style guide
# Coding standards: Use CODING_STYLE.md from rules/
```

#### Type Errors

```bash
❌ Error: Type mismatch in src/models/User.js

# Solution: Add JSDoc or TypeScript types
/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @returns {Promise<Object>} Created user object
 */
async function createUser(userData) {
  // Implementation
}
```

#### CI/CD Pipeline Failures

```bash
# 1. Check GitHub Actions logs
# Go to: Repository → Actions → [workflow run]
# Click failed job → View logs

# 2. Common failures:
# - "npm install failed" → check package.json dependencies
# - "Tests failed" → run tests locally, fix issues
# - "Build failed" → check Dockerfile syntax
# - "Deploy failed" → check Railway credentials

# 3. Debug locally with exact CI environment
# Use docker-compose.test.yml if available
# Or manually replicate CI steps from .github/workflows/ci-cd.yml
```

#### Secret Not Found in CI/CD

```bash
❌ Error: The referenced secret 'DOCKER_USERNAME' is not available

# Solution:
# 1. Go to GitHub repo → Settings → Secrets and variables → Actions
# 2. Verify secret exists and is spelled correctly
# 3. Workflow file uses correct secret name
# 4. Secret is not fork-only (required for forks)

# In workflow file:
- name: Login to Docker Hub
  uses: docker/login-action@v2
  with:
    username: ${{ secrets.DOCKER_USERNAME }}  # ← Exact name
    password: ${{ secrets.DOCKER_PASSWORD }}
```

---

## 📊 Available npm Scripts

```bash
# Development
npm run dev              # Start dev server with nodemon
npm run start           # Production server
npm run seed            # Seed database with sample data

# Testing
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:unit      # Run unit tests only
npm run test:integration # Run integration tests
npm run test:coverage  # Generate coverage report

# Code Quality
npm run lint            # Run ESLint
npm run format          # Run Prettier
npm run typecheck      # Type checking
npm run validate       # Run all checks (lint + test)

# Security & Compliance
npm audit               # Check dependency vulnerabilities
npm run security:audit  # OWASP security scan
npm run validate:env   # Validate environment variables

# Build & Deployment
npm run build          # Build for production
npm run docker:build   # Build Docker image
npm run docker:run     # Run Docker container

# Database & Utilities
npm run db:migrate     # Run migrations
npm run db:seed        # Seed database
npm run logs:follow    # Follow application logs
npm run redis:ping     # Test Redis connection
```

---

## 🚀 Quick Reference

### Common Tasks

| Task | Command |
|------|---------|
| Start dev server | `npm run dev` |
| Run tests | `npm test` |
| Fix linting issues | `npm run format` |
| Deploy to staging | Merge to `main` (automatic via GitHub Actions) |
| Deploy to production | Approve in GitHub Actions (after main merge) |
| View API docs | `http://localhost:3000/api-docs` |
| Check coverage | `npm run test:coverage && open coverage/lcov-report/index.html` |

---

## 📞 Getting Help

- **Local Setup Issues**: Check ENVIRONMENT_SETUP.md
- **Security Questions**: Review SECURITY_AUDIT.md
- **Deployment Help**: Check DEPLOYMENT_GUIDE.md
- **CI/CD Issues**: See GITHUB_SECRETS_SETUP.md and .github/workflows/ci-cd.yml
- **Testing Help**: Review tdd-workflow skill guide in rules/

---

**Last Updated:** 2026-04-12
**Maintained By:** Audira Development Team
