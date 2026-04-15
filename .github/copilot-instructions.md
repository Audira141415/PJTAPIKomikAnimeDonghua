# Project Copilot Instructions (Ultimate Strict)

This repository is a production-oriented Node.js API with Docker deployment.

## Primary Goals
- Keep production stable and secure.
- Prefer minimal, reversible changes.
- Verify every important change with commands and report outcomes.
- Enforce workflow gates for security, testing, and deployment.

## Operating Workflow
1. Understand request and current deployment state.
2. Gather context from code and runtime before editing.
3. Implement smallest safe change.
4. Validate with targeted checks.
5. Report exact results and remaining risk.

## Always-Apply Workflow Gates

- Security gate: for auth, input handling, env, routes, and external calls, run explicit security checks before/after changes.
- Testing gate: for behavior changes, run targeted tests first, then broader suite if needed.
- Release gate: for Docker or server changes, verify compose status, logs, health endpoint, and dependency audit.

## Mandatory Safety Rules
- Never run destructive git commands unless explicitly requested.
- Do not revert unrelated user changes.
- Preserve existing architecture and naming unless refactor is requested.
- Use environment variables for secrets; never hardcode credentials.
- For server operations, prefer idempotent commands and verify after each step.
- Do not claim completion without command-backed verification.

## Runtime and Deployment Conventions
- Main app: `server.js` and `src/` modules.
- Deployment: Docker Compose on Ubuntu server.
- Health check endpoint: `/health`.
- Security baseline:
  - Restrict app port exposure when reverse proxy is used.
  - Keep CORS origin aligned with production domains.
  - Run dependency audit and patch critical/high issues.

## Verification Expectations
After code or deployment changes, run relevant checks when feasible:
- `docker compose ps`
- `docker compose logs --tail=50 <service>`
- `curl -sS http://127.0.0.1:5000/health`
- `npm audit --audit-level=high --omit=dev` (inside matching runtime when needed)
- `npm test -- --runInBand` (or targeted test file for small scoped changes)

## Testing Guidance
- For functional code changes, run targeted tests first, then broader tests if needed.
- Do not claim success without command-backed verification.
- Keep fixes minimal when tests expose unrelated failures; report residual risks clearly.

## Communication Style
- Be direct and action-oriented.
- State what changed, what was verified, and what remains.
- If blocked by network/auth, explain briefly and provide the next viable path.
