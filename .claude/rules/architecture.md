/**
 * @file architecture.md
 * @purpose Core architecture rules for the Audira Comic API
 * @scope All Claude interactions within this workspace
 */

# Architecture & Module Boundaries (MANDATORY)

## Stack
- Node.js 20 + Express 4 + MongoDB (Mongoose 8) + Redis 7 (ioredis) + BullMQ
- Modular Monolith — Domain-Driven Design
- Docker Compose → Production server 192.168.100.158
- Frontend: Vanilla HTML/CSS/JS (client/admin-portal/)

## Module Aliases (from package.json `_moduleAliases`)
Always use aliases — never use relative paths crossing domain boundaries:
- `@core` → `src/core` (database connectors, utils, shared services)
- `@domains` → `src/domains` (catalogs, identity, interactions, metrics)
- `@middlewares` → `src/middlewares`
- `@scrapers` → `src/infrastructure/scraper/services`
- `@models` → `src/core/database/modelRegistry`
- `@repositories` → `src/core/database/repositoryRegistry`

## Domain Structure
Each domain feature follows: `src/domains/{domain}/{feature}/api/`, `services/`, `models/`.

## Singletons
- **Model Registry** (`src/core/database/modelRegistry.js`) — SINGLE source of truth for all Mongoose models.
- **Repository Registry** (`src/core/database/repositoryRegistry.js`) — SINGLE data-access layer.
- **Redis** — accessed ONLY via `require('@core/database/redis').getRedisClient()`. Never instantiate new connections.
- **Logger** — use `require('@core/utils/logger')` (Winston). Never use `console.log`.
- **Telegram** — use `require('@core/utils/telegram').sendAlert(title, htmlBody, severity)`.

## Middleware Stack Order (app.js)
`Helmet → CORS → Shield → RateLimiter → ClientUsage → Routes → ErrorHandler`
