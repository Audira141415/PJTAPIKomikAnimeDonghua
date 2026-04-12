# ⚡ Quick Start Checklist

Fast reference for getting Audira Comic API running locally or deploying to production.

---

## 🚀 First Time Setup (5 minutes)

```bash
# 1. Clone & Install
git clone https://github.com/your-org/audira-api.git
cd audira-api
npm install

# 2. Setup Environment
cp .env.example .env.local
# Edit .env.local with local values

# 3. Start Services (choose one)
# Option A: Docker (easiest)
docker-compose up -d

# Option B: Manual (macOS/Linux)
# Start MongoDB: mongod --dbpath /usr/local/var/mongodb
# Start Redis: redis-server

# Option C: Manual (Windows)
# - Install & start MongoDB from mongodb.com
# - Install & start Redis from github.com/microsoftarchive/redis

# 4. Run Development Server
npm run dev
# 🎉 API running at http://localhost:3000
# 📚 API Docs at http://localhost:3000/api-docs

# 5. Verify Setup
curl http://localhost:3000/health
# Should respond with: { "status": "ok", ... }
```

---

## 🧪 Running Tests (2 minutes)

```bash
# First time: Setup test database
npm test

# Run all tests
npm test

# Watch mode (re-run on changes)
npm run test -- --watch

# Coverage report
npm run test:coverage
open coverage/lcov-report/index.html

# Run specific test suite
npm test -- --testNamePattern="Auth Service"

# Run with debug output
DEBUG=* npm test
```

---

## ✅ Code Quality Checks (1 minute)

```bash
# Format code (auto-fix issues)
npm run format

# Run linter
npm run lint

# Run all checks
npm run validate

# Fix security issues
npm audit fix
npm run security:audit
```

---

## 🔀 Making Your First Change (10 minutes)

```bash
# 1. Create feature branch
git checkout -b feature/my-feature

# 2. Make changes to code
# Example: Edit src/modules/manga/manga.service.js

# 3. Write tests FIRST
# Create tests/unit/modules/manga/manga.service.test.js

# 4. Run tests
npm test -- tests/unit/modules/manga/manga.service.test.js

# 5. Format & lint
npm run format
npm run lint

# 6. Commit changes
git add .
git commit -m "feat: add manga search by author"

# 7. Push & create PR
git push origin feature/my-feature
# Go to GitHub and create pull request

# 8. Wait for GitHub Actions to pass ✅
# - Linting ✅
# - Security scan ✅
# - Unit tests ✅
# - Integration tests ✅

# 9. Request code review (2+ approvals required)

# 10. Merge PR
# Auto-deploys to staging 🚀
```

---

## 🌐 Deploying to Staging (2 minutes)

```bash
# 1. Merge PR to main branch
# (via GitHub UI or command line)
git checkout main
git pull origin main

# 2. Automated deployment starts:
# ✅ Runs full test suite
# ✅ Builds Docker image
# ✅ Deploys to staging
# ✅ Runs smoke tests
# 📧 Posts Slack notification

# 3. Verify staging
curl https://staging-api.audira.com/health

# 4. Test with frontend team
# Share staging URL: https://staging-api.audira.com
# Use Postman collection: postman_collection.json
```

---

## 🚀 Deploying to Production (3 minutes)

```bash
# Production deployment requires manual approval
# (automatic after merging to main)

# 1. Verify staging is working
# Check Slack notification from staging deployment

# 2. Go to GitHub Actions
# Repository → Actions → [latest workflow run]

# 3. Click "Review Deployments"

# 4. Select "production" environment

# 5. Click "Approve and Deploy"

# 6. Monitor deployment
# GitHub Actions shows progress
# Check Slack for notifications

# 7. Verify production
curl https://api.audira.com/health

# 8. Monitor for 1 hour
# Check Sentry dashboard for errors
# Check New Relic for performance
# Check MongoDB Atlas for query issues
```

---

## 🔍 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm test                # Run tests
npm run lint            # Check code style
npm run format          # Auto-fix code

# Database
npm run seed            # Add sample data
npm run db:migrate      # Run migrations

# Checking
npm audit               # Check dependencies
npm run validate:env   # Check environment vars
npm run security:audit  # Security scan

# Information
npm run test:coverage  # View test coverage
npm --version          # Check npm version
node --version         # Check Node version
```

---

## 📚 Essential Documentation

| Need | Document |
|------|----------|
| **First time setup** | `ENVIRONMENT_SETUP.md` |
| **Daily development** | `DEVELOPER_WORKFLOW.md` |
| **Making commits** | `DEVELOPER_WORKFLOW.md` → Committing Code |
| **Security practices** | `SECURITY_AUDIT.md` |
| **Deploying code** | `DEPLOYMENT_GUIDE.md` |
| **API endpoints** | `README.md` → API Endpoints |
| **CI/CD secrets** | `GITHUB_SECRETS_SETUP.md` |
| **Project overview** | `README.md` |

---

## 🆘 Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| MongoDB won't connect | `docker-compose up -d` or check MONGODB_URI |
| Redis won't connect | `redis-cli ping` then `docker run -d -p 6379:6379 redis:7` |
| Tests failing | `npm test -- --clearCache` then `npm test` |
| Port 3000 in use | `lsof -ti:3000 \| xargs kill -9` or use different PORT |
| Linting errors | `npm run format` then `npm run lint` |
| Missing secrets | Check `.env.local` exists and has all required variables |
| Branch issues | `git fetch origin && git status` |

---

## 🎯 Before You Commit

```bash
# Checklist before pushing code:
☐ Changes work locally
☐ Tests pass: npm test
☐ Types are correct: npm run typecheck (if applicable)
☐ Code is formatted: npm run format
☐ Linting passes: npm run lint
☐ No secrets in code (passwords, API keys, etc.)
☐ Error messages are user-friendly
☐ Complex code has comments
☐ Tests cover edge cases
☐ Database queries are optimized
☐ Rate limiting applied if needed
☐ CORS is configured correctly
```

---

## 🔐 Before You Deploy

```bash
# Deployment checklist:
☐ All tests passing (npm test)
☐ Security scan passing (npm audit)
☐ Coverage > 80% (npm run test:coverage)
☐ Code review approved (2+ reviewers)
☐ No breaking schema changes
☐ Database migrations tested
☐ Environment variables documented
☐ Secrets are NOT in code
☐ README updated if needed
☐ API documentation updated
☐ Monitoring dashboards ready
☐ Rollback procedures documented
```

---

## 📞 Getting Help

```
Issue Type              Where to Look
─────────────────────────────────────────────
Setup problems         → ENVIRONMENT_SETUP.md
Code quality          → DEVELOPER_WORKFLOW.md
Security questions    → SECURITY_AUDIT.md
Deployment issues     → DEPLOYMENT_GUIDE.md
CI/CD problems        → GITHUB_SECRETS_SETUP.md
API documentation    → README.md or http://localhost:3000/api-docs
Testing help         → tdd-workflow in rules/
```

---

## ⏱️ Time Estimates

| Task | Time |
|------|------|
| First-time setup | 5 min |
| Run tests | 2 min |
| Code quality checks | 1 min |
| Making & committing code | 10 min |
| Create & approve PR | 30 min |
| Deploy to staging | 2 min (automatic) |
| Deploy to production | 3 min (automatic after approval) |

---

## 🎓 Learning Path

1. **Read**: `README.md` (project overview)
2. **Setup**: Follow "First Time Setup" section above
3. **Explore**: `npm run dev` and visit http://localhost:3000/api-docs
4. **Practice**: Make a small change following "Making Your First Change"
5. **Learn**: Read `DEVELOPER_WORKFLOW.md` thoroughly
6. **Read**: `SECURITY_AUDIT.md` for security best practices
7. **Deploy**: Follow staging deployment process
8. **Master**: Read language-specific rules from `.claude/rules/`

---

## ✨ You're All Set!

```
Welcome to Audira Comic API! 🚀

Next steps:
1. Setup local environment (5 minutes)
2. Read DEVELOPER_WORKFLOW.md
3. Make your first commit
4. Deploy to staging
5. Celebrate! 🎉

Questions? Check the documentation or reach out to the team.
Happy coding! 💻
```

---

**For detailed help, see:**
- `ENVIRONMENT_SETUP.md` — Complete setup guide
- `DEVELOPER_WORKFLOW.md` — Day-to-day workflow
- `DEPLOYMENT_GUIDE.md` — Production deployment
- `README.md` — Project overview & API reference

---

**Last Updated:** 2026-04-12
