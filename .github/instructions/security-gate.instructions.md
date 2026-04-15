---
description: "Use when changing auth, middlewares, routes, env, external API calls, or user-input handling. Enforces backend security gate before merge or deploy."
applyTo: "src/middlewares/**/*.js,src/routes/**/*.js,src/modules/**/*.js,src/config/**/*.js,src/utils/**/*.js,server.js,.env,.env.example"
---

## Security Gate (Mandatory)

Before finalizing any relevant change:
1. Validate user inputs at request boundaries.
2. Confirm auth and authorization logic is explicit and deny-by-default.
3. Confirm no secrets or tokens are written to logs.
4. Ensure external calls use safe defaults and bounded timeouts.
5. Confirm error responses do not leak internal details.

## Secret and Env Hygiene

- Never hardcode API keys, passwords, or tokens.
- Read secrets only from environment variables.
- Fail fast when required secrets are missing.

## Verification Commands

- `npm audit --audit-level=high --omit=dev`
- `docker compose logs --tail=50 api`
- `curl -sS http://127.0.0.1:5000/health`

If a security check cannot be run, explicitly state the gap and risk.
