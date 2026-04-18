/**
 * @file workflow.md
 * @purpose Efficiency, documentation, and database rules for AI assistants
 * @scope All Claude interactions within this workspace
 */

# Workflow & Hard Instructions (MANDATORY)

## Efficiency
4. Avoid reading entire large files if not needed; read only the relevant function block.
5. Process must be super efficient: minimal commands, minimal file reads, go straight to the target.
6. Do not mix many functions/logic in a single file; split into small modules with clear responsibilities.
7. If there is any initiative outside the user's request, **approval must be requested first** before execution.

## Documentation (MANDATORY)
8. Every file created or modified **must** have a short header doc at the very top of the file.
9. The header doc **must** contain at minimum:
   - Purpose of the file/module,
   - Used by whom (caller/route/controller),
   - Main dependencies (service/repo/API),
   - List of public/main functions,
   - Important side effects (DB read/write, HTTP call, file I/O).
10. If a file already has a header doc, it **must be updated** to remain accurate after changes.
11. Adding/modifying logic without updating the header doc is forbidden.
12. Header format must be concise, consistent, and easy to scan quickly (maximum efficiency for tracing).

## Database Standards (MANDATORY — Senior DBA Level)
13. Design queries with the principle of **minimum cost, minimum I/O, minimum lock contention**.
14. Always evaluate:
   - Cardinality/selectivity of filters,
   - Proper index usage,
   - Join order & join strategy,
   - Impact on CPU, memory, disk, and network.
15. Avoid resource-wasteful patterns (repeated processing, unnecessary temp tables, layered writes, N+1 queries) if solvable with a more concise query plan.
16. Choose the most efficient strategy for the context (upsert/merge/batch/incremental/query rewrite), not a single template approach.
17. Ensure safety at scale: proper transactional consistency, minimal locking, and fast execution even as data grows.
18. Before finalizing DB-heavy changes, briefly explain the efficiency rationale, trade-offs, and the performance risks being avoided.
