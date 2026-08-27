# TESTING_STRATEGY.md — Test Plan

## Layers
1. **Unit** — lib helpers (scrypt verify, signing, UID, ageing calc, ₹/rate math).
   Framework: Jest. Run `npm test`.
2. **Integration** — API routes against a scratch PostgreSQL DB (parameterized SQL,
   auth/permission enforcement, escrow matching). Supertest.
3. **E2E** — Playwright: login → each screen → create/update flows → CSV export.
4. **Manual smoke** — before each milestone: login + every screen + writes + export.

## Priorities (CEO)
- P0: auth + permission bypass tests (must never leak across projects).
- P0: escrow reconciliation math (variance, unmatched items).
- P1: ageing buckets + cashflow forecast.
- P1: booking wizard happy path.
- P2: E2E coverage of core flows.

## Gate
- `npm run lint` + `npm test` + `npm run build` must pass before approval closes an issue.

## Seed sanity
- `db:setup` asserts row counts (projects, units, leads, receipts, escrow rows).