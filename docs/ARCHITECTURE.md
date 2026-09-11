# ARCHITECTURE.md — Current State, Standards & Audit Findings

> Source of truth for how the Developer Inventory app is structured today, what the
> standardized target looks like, and the current audit open-items (referenced by
> GitHub issues `AUD-xxx`). No visual/UI changes are permitted during standardization
> ("fully finalize without any look update").

Last updated: 2026-09-09 · Branch in progress: `chore/standardize-project`

---

## 1. Platform & invariants

- Next.js **15.5.25**, React **19.2.8**, TypeScript **5.9.3** — must be preserved exactly.
- Pages Router only (no `app/` dir). Node runtime on API routes; edge middleware.
- Target cloud: Cloudflare Pages via OpenNext (`@opennextjs/cloudflare` 1.20.6).
- Database: PostgreSQL (production = Neon with Hyperdrive binding
  `b9057aad7125418589f900050b753284`; local = plain `pg`).
- CSS: design-token-driven inline style objects; no Tailwind, no shadcn/ui despite the
  AGENTS.md convention note (dead tooling see §4.7).
- Runtime deps actually imported: `@neondatabase/serverless`, `@opennextjs/cloudflare`,
  `jspdf`, `jspdf-autotable`, `next`, `nodemailer`, `pg`, `react`, `react-dom`.
- **Never imported (candidates to remove):** `formik`, `yup`, `date-fns`.

## 2. Runtime flow & data

### 2.1 Request path

```
Browser ─> edge middleware.ts (route→module gate, edge-safe HMAC verify)
         ─> pages/_app.tsx (session hydration via lib/useSession.ts)
         ─> page component ─> Shell.tsx (nav filtered by role)
         ─> GroupPage.tsx ─> components/screens/*.tsx (20 screens)
         ─> fetch() ─> /api/* routes (withPerm → lib/db.ts query)
         ─> Neon (Hyperdrive) / local pg / neon serverless
```

### 2.2 Auth

- Homemade HMAC-SHA256 signed session token (base64 body + hex sig), stored in an
  HttpOnly `session` cookie, 24h expiry. `lib/session.ts`.
- PBKDF2 password hashing via `lib/auth.ts`. Credentials (and role) read from the live
  `admins` table at every login — env-seeded default `admin@gmail.com` / `Admin123`
  only at first install/seed.
- `password_resets` table + expiring HMAC tokens for forgot/reset (`lib/mail.ts`).
- RBAC: `role_permissions` DB table is the source of truth; `lib/permissions.ts`
  (`withPerm`) guards API routes (403); `lib/permission-map.ts` is an edge-safe static
  copy used by `middleware.ts` for page-level gating → `/403`; Shell nav filtered client-side.

### 2.3 Data layer

`lib/db.ts` exposes a single `query()` that picks the transport by environment:
1. `HYPERDRIVE` binding (production Cloudflare) → `@neondatabase/serverless` driver
   pointed at the Hyperdrive connection string.
2. `DATABASE_URL` (local) → `pg` `Client`.
3. Neon serverless fallback.

Only parameterized SQL is used. Seeds/scripts under `db/` (`schema.sql`, `seed.ts`,
`reset.ts`) run via `tsx` against local/local-remote Postgres.

### 2.4 Screens & static data

- 16 top-level pages (thin wrappers) + 20 screens in `components/screens/` + shared
  `components/app/GroupPage.tsx` (header/back/tabs) + `components/Shell.tsx`.
- `lib/data.ts` holds mock/static seed data (`PROJECTS`, `UNITS`, `BUYERS`, `LEADS`,
  `RECEIPTS`, ...). Only these screens are **DB-wired**:
  - Inventory → `/api/inventory` (project-scoped)
  - Payments → `/api/receipts`
  - Sales (leads) → `/api/leads`
  - Users & roles → `/api/admins`
  - Projects (new-project) → `/api/projects`
  - Shell identity → `/api/auth/me`
- All other screens render static `lib/data.ts` fallback data (correct v1 behavior;
  tracked as AUD-006).

### 2.5 API surface (13 routes)

| Route | Guard | Methods | Notes |
|---|---|---|---|
| `/api/auth/login` | public | POST | **AUD-001 debug leak** |
| `/api/auth/logout` | session | POST | |
| `/api/auth/me` | session | GET | |
| `/api/auth/profile` | session | PUT | name/email/password |
| `/api/auth/forgot-password` | public | POST | |
| `/api/auth/reset-password` | public | POST | |
| `/api/dashboard` | session | GET | KPIs |
| `/api/inventory` | session | GET | `?project=` |
| `/api/leads` | session+perm | GET/POST | |
| `/api/receipts` | session+perm | GET/POST | |
| `/api/milestones` | session+perm | GET | |
| `/api/admins` | `Settings:REA` | GET/POST | **AUD-003 perm/validation** |
| `/api/projects` | `Inventory:Cre` | GET/POST | |

## 3. Configuration map

| File | Purpose |
|---|---|
| `package.json` | scripts: `dev`, `build` (= `next build`), `build:cf` (OpenNext), `pages:build` (+ custom script), `pages:deploy`, `lint` (= `tsc --noEmit`), `db:setup`, `db:reset`, `preview`, `deploy`, `upload`, `cf-typegen` |
| `tsconfig.json` | strict, `baseUrl: "."`, `paths: @/* ./`, `noEmit` |
| `next.config.mjs` | `reactStrictMode: true` + OpenNext Cloudflare dev init |
| `middleware.ts` | page-level RBAC gate (edge) |
| `wrangler.jsonc` | Worker `ellington-worker`, `main: .open-next/worker.js`, Hyperdrive binding |
| `open-next.config.ts` | OpenNext build config |
| `scripts/build-pages.mjs` | post-build static emit for Cloudflare Pages |
| `public/_headers`, `public/favicon.svg` | hosting headers + favicon |
| `.env.example` | documented env list (INITIAL_ADMIN_* first-install only) |
| `.npmrc` | (engine pinning) |
| `db/schema.sql`, `db/seed.ts`, `db/reset.ts` | DB source of truth + seed/reset |

## 4. Audit findings (AUD issue mapping)

> Each finding is filed as a GitHub issue prefixed `AUD-`. Status column describes the
> audited Project board (Not Checked / Failed / Fixing / Fixed / Retesting / Passed).

### Critical / High

- **AUD-001 (High) — Login errors leak internals.** `pages/api/auth/login.ts:47`
  returns `{ error: "debug: " + (e?.message || String(e)) }` to the client. The stack is
  already `console.error`ed server-side (line 46). Standardization fix: generic 500
  response; log details server-side only.
- **AUD-002 (High) — Hardcoded session-secret fallback.** `lib/session.ts:24` sets
  `SECRET_DEFAULT = "dev-secret-change-me"` and both `sign`/`verify` (lines 27, 36)
  silently fall back to it when `JWT_SECRET` env is unset. In production this makes
  session tokens forgeable. Standardization fix: fail closed (throw/reject when
  `JWT_SECRET` missing outside dev), or gate the fallback to `NODE_ENV !== "production"`.
- **AUD-003 (High/Med) — Password-reset token logged.** `lib/mail.ts:48` logs
  `PASSWORD_RESET_LINK ... url=<token>` to the server console when SMTP is not
  configured. In serverless logs this leaks valid reset tokens. Fix: never log the URL
  token; log only a truncated/dev-safe marker, or remove entirely.

### Medium

- **AUD-003b — `admins` POST guard + validation.** `pages/api/admins.ts:6` wraps with
  `withPerm("Settings", "REA", ...)` for both GET and POST; POST (user creation) should
  require a create-permission (`CRE`), and email/role fields are not validated
  server-side; default password `Admin123` is injected silently (`:30`). Fix: correct
  permission for POST, validate email format + allowed roles, require explicit password.
- **AUD-004 — Two permission sources of truth.** `lib/permission-map.ts` (edge, static)
  and `lib/permissions.ts` (server, DB) duplicate module/action lists; drift risk.
  `AUTH_ONLY_MODULES` empty export in `lib/permissions.ts:63` is dead code. Fix:
  single module/action list type + targeted tests, edge copy derived.
- **AUD-005 — No automated tests installed.** `docs/TESTING_STRATEGY.md` plans Jest +
  Playwright but neither is in `package.json`; `lint` = `tsc --noEmit` (typecheck only,
  no ESLint). Fix: add Jest + React Testing Library for lib/logic + API route tests, and
  Playwright for end-to-end; wire into `package.json` scripts.
- **AUD-006 — Incomplete DB wiring / static fallbacks.** Only 5 screens wire to APIs;
  15 render `lib/data.ts` mocks. No functional harm, but must be tracked so the
  standardization report reflects reality. Fix: sequential screen-by-screen wiring,
  each verified, or explicitly document the mock contract (MVP stage).
  **PARTIAL — Handover module wired** (`33e34b0` on branch `fix/aud-006-handover`):
  new `pipeline_items` / `snag_items` / `deeds` tables (idempotent DDL + seed guard in
  `db/schema.sql`), new `pages/api/handover.ts` (envelope, `Handover:REA`), and the three
  screens (Pipeline / Snagging / Deeds) now fetch live rows via `fetchJSON` with surfaced
  errors. Tables applied to the dev DB the app runs against. **System module wired**
  (`7a2b0b4` on branch `fix/aud-006-system`): new `audit_log` + `app_settings` tables
  (idempotent DDL + seed guard), `pages/api/system.ts` (GET envelope + PUT upsert behind
  `Settings:UPD`), AuditLog and Settings screens live via `fetchJSON`, Settings saves
  persist to `app_settings`. **Finance module (ledgers) wired** (`916a1f5` on branch
  `fix/aud-006-finance`): new `collections`, `drawdowns`, `invoices` tables (+ `received_at`
  on `escrow_ledger`) seeded idempotently, new `pages/api/finance.ts` (envelope returning
  `{collections, escrow:{queue,drawdowns}, invoices}` behind `Finance:REA`), Collections /
  Escrow / Invoices screens fetch live rows via `fetchJSON` with error banners. **AUD-015
  (`ad22adf`)**: cashflow forecast (`/api/finance-analytics` — bars, balance ladder, trigger
  split, monthly table from live payment_milestones/escrow_ledger/drawdowns) and real CSV
  report exports (`/api/report-export?report=`, whitelisted names) wired; Cashflow + Reports
  screens now render/export live data with error banners. Exec mobile remains an intentional
  static design prototype (no fetches).
- **AUD-007 — Fetch error handling swallowed.** Screens use local `let active` blocks
  with `.catch(() => {})`, silent fallback to mock data; shared `lib/useApi.ts` exists
  but is unused. Fix: adopt `useApi` (or equivalent) with `loading/error/data` states
  and a shared `fetchJSON` helper; no silent fallbacks after a real fetch attempt fails.
  **FIXED** (`2c3fe22` on branch `fix/aud-007-use-api`) — the four wired screens
  (Payments / Inventory / Sales Leads / Users) now GET via `fetchJSON<T>` in `lib/api.ts`
  (unwraps the `{ ok, data, error }` envelope, redirects to `/login` on 401) and render a
  red "Live data unavailable — showing sample rows" banner on failure instead of failing
  silently. POST actions keep existing optimistic UI. Live-verified: all four screens show
  real data, no banner.
- **AUD-008 — Dependency misalignment (dead deps).** `formik`, `yup`, `date-fns` in
  `package.json` but never imported. AGENTS.md claims Formik+Yup convention — either
  adopt them for forms or drop them; remove `date-fns` (hand-rolled date math used).
- **AUD-009 — API validation/response inconsistency.** Routes hand-roll validation and
  return heterogeneous shapes (`{users}`, `{units}`, `{leads}`, `{error}`, `{ok}`).
  Fix: shared `{ ok, data, error }` envelope + small validation helpers reused across
  the 13 routes. **FIXED** (`421594a` on branch `fix/aud-009-api-envelope`) — `lib/api.ts`
  adds the envelope (`ok`/`fail`/`methodNotAllowed`/`notFound`) + `validEmail`/`missingFields`
  helpers; all 13 routes return `{ ok, data, error }`; `useSession`/login + the
  wired screens parse `data`; error messages and status codes unchanged.

### Low

- **AUD-010 — Duplicated `Stub`.** Same unnamed-module fallback component defined in
  `pages/dashboard.tsx:69` and `components/app/GroupPage.tsx:9`. Fix: single export in
  `components/app/Stub.tsx` (no visual change).
- **AUD-011 — Typed screen mappers with `any`.** `Inventory.tsx:5` `toUnitShape(row: any)`,
  `Users.tsx:77` `(u: any)`. Fix: typed API response interfaces (no visual change).
- **AUD-012 — Session cookie hardening.** `lib/session.ts:75` `serializeCookie` has no
  `Secure` flag / `__Host-` prefix and cookie name is generic `session`. Fix: emit
  `Secure` on https, prefix `__Host-`, keep `HttpOnly` + `SameSite=Lax`.
- **AUD-013 — `.env.example` shipping seed credentials.** `INITIAL_ADMIN_EMAIL/PASSWORD`
  are documented as first-install-only; verify no real production values are committed
  and mark as example-only values.
- **AUD-014 — Repo hygiene.** `backups/` holds real Neon data and is not in `.gitignore`;
  records in `OneTask.md` referencing old branches need consolidation. Fix: add
  `backups/` (+ `*.local`, `.vercel/`) to `.gitignore`.
- **AUD-016 (#51) — Dead `lib/useApi.ts`.** Only `pages/dashboard.tsx` imported it; all
  wired screens use `fetchJSON<T>` from `lib/api.ts`. **FIXED** (`fix/aud-051-dead-use-api`) —
  dashboard.tsx switched to `fetchJSON`, `lib/useApi.ts` deleted, references tidied.

### Sales / PLINTH feature audit (2026-09-09)

SALES screens compared against the PLINTH prompt pack (PROMPT 1.7 booking workflow,
1.8 buyer directory + buyer 360, 1.11 leads/CRM, 2.9 documents). Files: `pages/sales.tsx`,
`components/screens/Sales.tsx`, `pages/api/{leads,buyers,bookings,brokers,documents}.ts`.

- **AUD-017 (#60, Medium) — Booking wizard incomplete vs PROMPT 1.7.** Soft-lock countdown
  is static text (`Sales.tsx:564`), "Save as draft" is a dead button (`Sales.tsx:645`),
  Step 3 payment schedule not editable / no 100% validator / no construction timeline,
  Step 4 documents static labels only, success screen is a banner not a screen, no
  emails/notifications on confirm (`api/bookings.ts:confirmBooking`).
- **AUD-018 (#65, Medium) — Buyer directory incomplete vs PROMPT 1.8.** Missing columns
  (Buyer ID, Nationality, Type, Outstanding, Documents bar, Agent, Broker), no filters,
  no bulk actions, no "Documents expiring" filter. `api/buyers.ts` drops agent/broker/
  nationality/type data.
- **AUD-019 (#66, Medium) — Buyer 360 incomplete vs PROMPT 1.8.** Only 3 of 7 tabs
  (UNITS/LEDGER/SCHEDULE; missing PROFILE/DOCUMENTS/COMMUNICATIONS/ACTIVITY); header
  missing name AR, nationality, risk badge, portal access.
- **AUD-020 (#69, Medium) — Leads/CRM incomplete vs PROMPT 1.11.** Kanban primary + drag
  persist + leaderboard PASS; missing table secondary view, right drawer (contact/
  timeline/documents/notes), source attribution strip, viewings calendar.
- **AUD-021 (#72, Low) — Document Template Studio not functional vs PROMPT 2.9.** Block
  editor is a static list (no drag reorder), "Save as v4 draft" is client-only; versions
  + activate live via `api/documents.ts` PASS.

### Project workspace / PLINTH audit (2026-09-09)

PROJECT workspace screens compared against the PLINTH prompt pack (1.3 Create-Project wizard,
1.4 Unit builder, 1.5 Inventory grid, 1.6 Unit detail, 1.12 Pricing & availability,
1.13 Construction). Files: `pages/project.tsx`, `components/screens/{Projects,Inventory,Unit,
Pricing,Construction}.tsx`, `pages/api/{projects,inventory,milestones,construction}.ts`.

The six core prompts are tracked across **#71 / #74 / #75 / #80 / #81 / #83** (all OPEN, created
this session — CREATE-PROJECT wizard and UNIT BUILDER are MISSING/high; Inventory grid, Unit
detail, Pricing, Construction are PARTIAL/medium). This addendum records the additional
screen-level findings found while re-reading those files:

- **AUD-024 (#91, Low) — CSV export bugs in Inventory/Pricing.** `Inventory.tsx` `exportedRows()`
  escapes with `.replace(/"/g, '"')` — a no-op — so fields with `"`/`,` produce malformed CSV and
  there is no formula-injection guard; both `Inventory.tsx` and `Pricing.tsx` `exportCsv` hardcode
  the same download filename `ellington-price-list.csv`.
- **AUD-025 (#90, Low) — Inventory header count frozen.** `Inventory.tsx:209` prints static
  `UNITS.length` (258 mock) even when live `dbUnits` load; `scopeName = 'Tower 1'` (line 150) is
  hardcoded, not derived from the selected project/building.
- **AUD-026 (#92, Low) — `/project` blank for unknown screens.** `pages/project.tsx` returns
  `null` for any `s=` outside inventory/unit/pricing/construction, whereas the other group pages
  fall back to a `<Stub>`; also no Overview/Typologies nav (cf. #70) and no wizard entry point.

Standards check (AGENTS.md) on the PROJECT workspace API routes PASSED: `projects`, `inventory`,
`construction` all use parameterized SQL and are wrapped with `withPerm`/`hasPerm` (fail-closed,
no debug bypass). Exceptions already tracked: `/api/milestones.ts` guarded `Finance:REA` but
consumed by the Project·Unit screen (Inventory module) → **AUD-023 (#87)**.

## 5. Standardized folder structure (target)

```
Developer inventory/
  docs/            docs (DATABASE, AUTH_FLOW, API_REFERENCE, ARCHITECTURE, ...)
  db/              schema.sql, seed.ts, reset.ts
  lib/             framework-agnostic helpers (auth, session, db, pdf, format, ...)
  components/      app/ (shared), screens/ (feature screens), Shell.tsx
  pages/           next routes;  pages/api/auth/* + pages/api/* data routes
  public/          static assets (_headers, favicon)
  scripts/         build helpers (build-pages.mjs, test/audit harnesses)
  Archive/         reference UI (read-only)
```

No renames/moves required — current layout matches; the audit only verifies and
documents it.

## 6. Verification & regression baseline

- `npm run lint` = `tsc --noEmit` — green.
- `npm run build` = `next build` — green (all 16 routes compiled).
- `npm run build:cf` under Node 22 emits valid `.open-next/worker.js` + assets.
- Browser baseline: `verify_functionality.js` 89/89 and `verify_responsive.js` 70/70
  passed previously (commit 524ace6). Round-trip retest re-runs after Phase 6+7 fixes.
- Live Neon smoke: login + `/api/auth/me` returned 200 with admin
  `Dipin Ellington`/`admin@gmail.com` on the deployed worker.

## 7. Sequencing of standardization work

1. Phase 3 — rewrite `AGENTS.md` as the full development rulebook.
2. Phase 4 — `.opencode/` rules & agents.
3. Phase 5 — confirm folder structure (no moves needed).
4. Phase 6+7 — safe fixes, each linked to its `AUD-xxx` issue: AUD-001, AUD-002,
   AUD-003, AUD-003b, AUD-004, AUD-007, AUD-008, AUD-009, AUD-010, AUD-011,
   AUD-012, AUD-013, AUD-014.
5. Phase 8 — `lint` + `build` green after fixes.
6. Round-trip retest — browser smoke + API regression.
7. Phase 9 — `TASKS.md`.
8. Phase 10 — final report: update the Project board + close issues.