/**
 * @file coding-standards.md
 * @purpose Coding conventions and patterns for all backend JS files
 * @scope All Claude interactions within this workspace
 */

# Coding Standards & Patterns (MANDATORY)

## Language Rules
- `'use strict';` at the top of every backend JS file.
- `const` by default; `let` only when reassignment is required. Never `var`.
- Async/await everywhere. No raw `.then()/.catch()` chains.

## Error Handling
- Wrap service logic in try/catch.
- Let the global `error.middleware.js` handle Express-level errors.
- Response format: `{ success: true/false, data: ..., message: ... }` via `src/core/utils/response.js`.

## Scraper Pattern
- Each scraper is self-contained in `src/infrastructure/scraper/services/` (e.g. `otakudesu.service.js`).
- BullMQ jobs in `src/jobs/`. Worker processes; Scheduler enqueues.

## Frontend (Admin Dashboard)
- Pure HTML/CSS/JS in `client/admin-portal/`. No bundler.
- CSS custom properties in `:root` — never hardcode colors.
- Fonts: `Outfit` (headings), `Inter` (body), `JetBrains Mono` (code/metrics).
- API calls use relative paths (`/api/v1/...`).
- `copyText()` must maintain the **textarea fallback** for non-HTTPS (HTTP IP) contexts.
- Theme: `data-theme` attribute on `<html>`. Respect `[data-theme="light"]`.
