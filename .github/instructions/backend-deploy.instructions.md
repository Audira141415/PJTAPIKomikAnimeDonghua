---
applyTo: "server.js,src/**/*.js,docker-compose.yml,Dockerfile,scripts/**/*.js,.env,.env.example"
description: "Use when hardening backend API, editing docker deployment, or changing runtime env. Enforces strict verification and safe rollout workflow."
---

## Backend and Deployment Rules

- Keep changes small and scoped to requested behavior.
- Maintain compatibility with existing API routes and response envelopes.
- Validate inputs at boundaries and preserve explicit error handling.
- Prefer immutable updates to config and avoid hidden side effects.

## Security and Hardening Checklist

- Ensure no secrets are introduced in code or logs.
- Confirm CORS settings match intended production origins.
- Prefer localhost binding for internal services behind reverse proxy.
- Patch vulnerable dependencies with minimal version changes when possible.
- Reject unsafe shortcuts for auth, TLS, or secret handling.

## Docker/Server Change Checklist

When changing deployment behavior:
1. Confirm compose syntax and service health.
2. Rebuild only affected services when possible.
3. Verify API readiness via `/health`.
4. Check logs for startup/runtime regressions.
5. Record exact commands used for verification.
6. Keep rollback command path ready before risky changes.

## Git and Release Discipline

- Keep commit scope clear and atomic.
- If remote push fails due to auth/network, do not force workarounds that risk secrets.
- Provide explicit command alternatives for local push from a connected machine.
- If a step is blocked, stop and surface a safe alternative with next action.
