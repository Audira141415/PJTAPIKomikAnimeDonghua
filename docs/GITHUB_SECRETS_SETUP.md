# 🔐 GitHub Actions Secrets Configuration

## Overview

This guide explains how to configure GitHub Actions secrets for CI/CD pipeline automation in the `.github/workflows/ci-cd.yml` file.

---

## 1. Required Secrets

### Step 1: Navigate to GitHub Secrets

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Step 2: Add Secrets

Add the following secrets for the CI/CD pipeline to work:

#### **Docker Hub Credentials**

```
Name: DOCKER_USERNAME
Value: your-dockerhub-username

Name: DOCKER_PASSWORD
Value: your-dockerhub-personal-access-token
```

**How to get Docker Hub token:**
1. Go to https://hub.docker.com/settings/security
2. Click **New Access Token**
3. Set permissions: Read, Write, Delete
4. Copy the token and paste in GitHub

---

#### **Railway.app Deployment**

```
Name: RAILWAY_TOKEN
Value: your-railway-api-token

Name: RAILWAY_PROJECT_ID
Value: your-railway-project-id

Name: RAILWAY_ENVIRONMENT_STAGING
Value: your-staging-environment-id

Name: RAILWAY_ENVIRONMENT_PROD
Value: your-production-environment-id
```

**How to get Railway credentials:**
1. Go to https://railway.app/account/tokens
2. Create new token with **Admin** permissions
3. Go to your project → **Project ID** in settings
4. Each environment has an ID in the environment selector

---

#### **Slack Notifications**

```
Name: SLACK_WEBHOOK
Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**How to get Slack webhook:**
1. Go to your Slack workspace → **Apps**
2. Search **Incoming Webhooks** → **Add to Slack**
3. Choose channel for notifications
4. Copy **Webhook URL**

---

#### **Sentry Error Tracking**

```
Name: SENTRY_ORG
Value: your-sentry-organization

Name: SENTRY_PROJECT
Value: your-sentry-project-name

Name: SENTRY_AUTH_TOKEN
Value: your-sentry-auth-token
```

**How to get Sentry credentials:**
1. Go to https://sentry.io/organizations/
2. Click your organization
3. Go to **Settings** → **Auth Tokens**
4. Create new token with `project:releases` permission

---

#### **MongoD Atlas (if using)**

```
Name: MONGODB_URI_STAGING
Value: mongodb+srv://staging_user:password@staging.mongodb.net/audira-staging?retryWrites=true

Name: MONGODB_URI_PROD
Value: mongodb+srv://prod_user:password@prod.mongodb.net/audira?retryWrites=true
```

---

#### **Redis/Cache Credentials**

```
Name: REDIS_URL_STAGING
Value: rediss://:password@staging-redis.railway.internal:6379/0

Name: REDIS_URL_PROD
Value: rediss://:password@prod-redis.railway.internal:6379/0

Name: REDIS_PASSWORD
Value: your-redis-password
```

---

#### **JWT Secrets (per environment)**

```
Name: JWT_SECRET_STAGING
Value: <generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

Name: JWT_SECRET_PROD
Value: <generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
```

---

## 2. Environment-Specific Configuration

### Staging Environment Secrets

```javascript
// Used by: deploy-staging job
RAILWAY_ENVIRONMENT_STAGING=xxx
MONGODB_URI_STAGING=xxx
REDIS_URL_STAGING=xxx
JWT_SECRET_STAGING=xxx
```

### Production Environment Secrets

```javascript
// Used by: deploy-production job (requires manual approval)
RAILWAY_ENVIRONMENT_PROD=xxx
MONGODB_URI_PROD=xxx
REDIS_URL_PROD=xxx
JWT_SECRET_PROD=xxx
SLACK_WEBHOOK=xxx  // For production notifications
```

---

## 3. Complete Secrets Checklist

Add these secrets to GitHub:

```yaml
✅ DOCKER_USERNAME
✅ DOCKER_PASSWORD
✅ RAILWAY_TOKEN
✅ RAILWAY_PROJECT_ID
✅ RAILWAY_ENVIRONMENT_STAGING
✅ RAILWAY_ENVIRONMENT_PROD
✅ SLACK_WEBHOOK
✅ SENTRY_ORG
✅ SENTRY_PROJECT
✅ SENTRY_AUTH_TOKEN
✅ MONGODB_URI_STAGING
✅ MONGODB_URI_PROD
✅ REDIS_URL_STAGING
✅ REDIS_URL_PROD
✅ REDIS_PASSWORD
✅ JWT_SECRET_STAGING
✅ JWT_SECRET_PROD
```

**Total: 17 secrets required for full CI/CD**

---

## 4. Secret Scope & Visibility

### Repository Secrets
```
Applies to: All workflows, all branches
Visibility: Private (not visible in logs)
Access: Only repository contributors
```

### Branch Secrets (Optional)
```
Settings → Environments → [environment-name] → Deployment branches & secrets
Applies to: Production deployments only
Requires: Manual approval
```

---

## 5. Security Best Practices

### ✅ DO:
- [ ] Use strong, randomly generated secrets (min 32 chars)
- [ ] Rotate secrets every 90 days
- [ ] Enable **Require branches to be up to date** on production
- [ ] Enable **Require code reviews** before deployment
- [ ] Use **Environment deployment branches** for production
- [ ] Audit secret access logs regularly
- [ ] Use secrets only in specific workflow steps

### ❌ DON'T:
- [ ] Never commit secrets to Git (use `.gitignore`)
- [ ] Never print secrets in logs (GitHub masks them but be careful)
- [ ] Never hardcode secrets in workflow files
- [ ] Never share secrets via email or Slack
- [ ] Never use same secret across dev/staging/prod
- [ ] Never grant unnecessary permissions

---

## 6. Verify Secrets Are Working

### Check in GitHub Actions

```bash
# In workflow file, you can test secret presence
- name: Verify secrets
  run: |
    if [ -z "${{ secrets.DOCKER_USERNAME }}" ]; then
      echo "❌ DOCKER_USERNAME secret not set"
      exit 1
    fi
    echo "✅ All required secrets are configured"
```

### Check in Logs

```bash
# GitHub automatically masks secret values in logs
# You'll see:
DOCKER_PASSWORD=***
RAILWAY_TOKEN=***
JWT_SECRET=***
```

---

## 7. Troubleshooting

### "Secret not found" Error

```yaml
# ❌ WRONG - Typo in secret name
run: echo ${{ secrets.DCOKER_USERNAME }}

# ✅ CORRECT - Exact spelling
run: echo ${{ secrets.DOCKER_USERNAME }}
```

### Secrets Not Available in Fork

```
⚠️ Forks cannot access repository secrets
✅ Solution: Only deploy from main repository
✅ PR checks will fail on forks (expected behavior)
```

### Workflow Job Failing on Secret Access

```bash
# Add debug step to find which secret is missing
- name: Debug secrets
  run: |
    echo "Checking all secrets..."
    echo "DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}"
    echo "RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}"
    echo "JWT_SECRET: ${{ secrets.JWT_SECRET }}"
```

---

## 8. Secret Rotation Procedure

### Monthly Rotation Schedule

```bash
# 1. Generate new secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
echo "New secret: $NEW_SECRET"

# 2. Update in GitHub Secrets
#    - Settings → Secrets → Update [SECRET_NAME]
#    - Paste new value

# 3. Trigger workflow to verify
git commit --allow-empty -m "chore: rotate secrets"
git push

# 4. Monitor deployment logs
#    - Check no "permission denied" errors
#    - Verify service connectivity

# 5. Audit secret usage
#    - Remove old secret after verification (1-2 hours)
```

---

## 9. Reference: CI/CD Workflow Jobs

Each job uses specific secrets:

| Job | Secrets Used | When Run |
|-----|--------------|----------|
| **lint** | None | Every push & PR |
| **security** | None | Every push & PR |
| **unit-tests** | None | Every push & PR |
| **integration-tests** | MONGODB_URI, REDIS_URL, JWT_SECRET | Every push & PR |
| **build** | DOCKER_USERNAME, DOCKER_PASSWORD | On main branch only |
| **deploy-staging** | RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_STAGING | On main branch only |
| **smoke-tests** | None (uses staging URL) | After staging deploy |
| **deploy-production** | RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_ENVIRONMENT_PROD | On main branch (manual approval) |
| **performance-check** | None | After prod deploy |

---

## 10. Example: Setting Up Environment

### Quick Setup (5 minutes)

```bash
# 1. Generate secure secrets
JWT_SECRET_STAGING=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET_PROD=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 2. Copy secrets to clipboard / write down
echo "JWT_SECRET_STAGING=$JWT_SECRET_STAGING"
echo "JWT_SECRET_PROD=$JWT_SECRET_PROD"

# 3. Go to GitHub Secrets and add:
# - JWT_SECRET_STAGING
# - JWT_SECRET_PROD
# - DOCKER_USERNAME
# - DOCKER_PASSWORD
# - RAILWAY_TOKEN
# - etc.

# 4. Test workflow
git add .
git commit -m "chore: setup CI/CD secrets"
git push

# 5. Monitor: GitHub Actions tab
```

---

## 📞 Getting Help

- GitHub Actions Documentation: https://docs.github.com/en/actions
- Managing Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Railway Documentation: https://docs.railway.app
- Sentry Documentation: https://docs.sentry.io

---

**Last Updated:** 2026-04-12
