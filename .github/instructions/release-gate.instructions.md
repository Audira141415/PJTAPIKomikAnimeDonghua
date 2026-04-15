---
description: "Use when changing Docker, compose, runtime env, deployment scripts, or production operations. Enforces strict release gate and rollback readiness."
applyTo: "docker-compose.yml,Dockerfile,scripts/**/*.js,*.bat,.env,.env.example"
---

## Release Gate (Mandatory)

Before declaring deployment complete:
1. Validate service health and status.
2. Validate runtime logs for regressions.
3. Validate health endpoint response.
4. Run dependency audit at high threshold.
5. Confirm rollback path is known.

## Required Runtime Checks

- `docker compose ps`
- `docker compose logs --tail=50 api`
- `curl -sS http://127.0.0.1:5000/health`
- `npm audit --audit-level=high --omit=dev`

## Safe Rollout Rules

- Prefer idempotent commands.
- Rebuild only impacted services where possible.
- If blocked by network/auth, stop and provide safe alternative path.
