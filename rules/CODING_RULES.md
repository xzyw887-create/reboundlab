# CODING RULES — ReboundLab

## TypeScript (API, Frontend)

- Strict mode enabled
- ESLint + Prettier
- Zod for runtime validation
- No `any` without comment
- Functions < 50 lines where possible

## Python (Backtester, Market Data)

- Python 3.12+
- Type hints required
- pytest for tests
- Black formatter
- No magic numbers — use constants

## SQL

- Migrations only (no manual ALTER in prod)
- Parameterized queries
- Indexes documented in DATABASE.md

## Git commits

Format: `feat(M15): add cross-margin liquidation check`

Types: feat, fix, docs, chore, test, refactor

## Tests

- Unit tests for calculation logic (mandatory)
- Integration tests for API endpoints
- No tests for trivial getters

## Naming

- Files: kebab-case (`trade-simulator.ts`)
- Python modules: snake_case
- DB tables: snake_case plural (`backtest_runs`)
- API paths: kebab-case (`/backtest/runs`)

## Comments

- Only for non-obvious business logic
- No commented-out code in main branch
