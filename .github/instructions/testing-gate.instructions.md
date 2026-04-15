---
description: "Use when implementing bug fixes, feature changes, or refactors. Enforces strict testing gate with targeted-first execution and explicit risk reporting."
applyTo: "src/**/*.js,tests/**/*.js,jest.config.js,package.json"
---

## Testing Gate (Mandatory)

For behavior changes:
1. Run the most relevant targeted test first.
2. If targeted tests pass, run broader test scope when feasible.
3. Report exact pass/fail outcomes and remaining known failures.

## Coverage and Quality

- Keep or improve current coverage baseline.
- Do not hide unrelated failing tests; report them separately.
- Keep fixes minimal if unrelated failures exist.

## Minimum Verification

- Targeted test command for affected module/route/service.
- `npm test -- --runInBand` when change scope is medium/high.
