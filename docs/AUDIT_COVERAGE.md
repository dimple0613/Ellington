# Route & Access Audit — Coverage Report

Date: 2026-09-07 · Tester: audit harness (puppeteer-core + `next start`)

Source topology: `middleware.ts` + `lib/nav.ts` + `lib/screens.ts` + `pages/*`

---

## 1. Route discovery (from source)

| Layer | Count | Notes |
|---|---|---|
| Top-level page routes | 14 | `/` (client → `/dashboard`), `/login`, `/forgot-password`, `/reset-password`, `/dashboard`, `/project`, `/inventory` (client → `/project?s=inventory`), `/sales`, `/finance`, `/handover`, `/system`, `/mobile`, `/profile`, 404 default |
| API routes | 8 | auth/login, auth/logout, auth/me, auth/profile, auth/forgot-password, auth/reset-password, dashboard, inventory |
| Query-param sub-screens | 25 | across 7 groups (dashboard 4, project 4, sales 6, finance 4, handover 3, system 3, mobile 1) |
| Dynamic params | 4 | `?scope=`, `?unit=`, `?name=`, `?buyer=` |
| Custom 404/500 pages | none | Next.js defaults |

Full inventory: `docs/ROUTE_INVENTORY.md`.

## 2. Access control matrix (HTTP, no browser)

Middleware: 9 protected prefixes (`/dashboard /project /inventory /sales /finance /handover /system /mobile /profile`), 3 public-only prefixes (`/login /forgot-password /reset-password`).

| Stage | Result |
|---|---|
| Public/auth pages without login | all reachable (200) |
| Protected pages without login (`test-access-noauth.mjs`) | **47/47** → 307 `/login?next=...` (no bypasses) |
| All pages after login (`test-access-auth.mjs`) | **31/31** → 200 |
| Public-only pages with a session cookie | 307 → `/dashboard` |

## 3. Functional browser audit (`audit2.mjs`)

| Area | Checks | Result |
|---|---|---|
| Auth flow (redirect, wrong creds inline error, login, identity) | 4 | PASS |
| Screen render matrix (all 25 screens + dashboard + unit + buyer contexts + profile) | 29 | PASS (0 console errors, 0 failed API calls after login) |
| Shell interactions (Ctrl+K palette, notifications, profile menu → profile) | 4 | PASS |
| Representative widget interactions (snagging Close, escrow New drawdown modal, users Invite) | 3 | PASS |
| Sign-out + post-signout protection | 2 | PASS |
| **Total** | **44** | **44/44 PASS** |

Note: prior `console-error` reports on these screens (incl. an `Invariant: attempted to hard navigate` pageerror and `_buildManifest.js` 404s) were artifacts of a stale `next start` server running against a rebuilt `.next` — all clear after restart.

## 4. Findings

| ID | Severity | Finding |
|---|---|---|
| A1 | **Medium** | No server-side role/permission enforcement. Middleware checks session only; every signed-in user — regardless of role — can access all 9 protected groups. The System → Users permission matrix (`components/screens/Users.tsx`) and Roles doc are client-side mock only. Single seeded role `super_admin` is a mitigant for a solo operator, but this should be a conscious decision, not silent. **RESOLVED 2026-09-07** — server-side RBAC implemented: `role_permissions` table (seeded `super_admin`/`ops`/`finance`/`viewer`), `lib/permissions.ts` + `withPerm` for API 403s, `middleware.ts` page gating → `/403`, client nav filtering. Verified 18/18 RBAC + regression. See `ROLES_AND_PERMISSIONS.md`. |
| A2 | Low | No site favicon — `/favicon.ico` 404s on every page load. **RESOLVED 2026-09-07** — SVG favicon added (`public/favicon.svg` + `<link>` in `_app.tsx`), verified 200. |
| A3 | Ops | Deployment surface needs operator action. **PARTIALLY RESOLVED 2026-09-07** — erroneous `wrangler.toml` (`pages_build_output_dir = ".vercel/output/static"`, non-existent dir) removed; correct config is `wrangler.jsonc` (Worker `ellington-worker`, `main: .open-next/worker.js`, assets from `.open-next/assets`), verified local `build:cf` emits valid output. **OUTSTANDING:** `origin/main` is 17 commits behind `kartik-gohil`; production not redeployed; no Cloudflare credentials available locally to run `wrangler deploy` (requires `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` or interactive `wrangler login`); production Neon admin row seeded via env at first boot only. |
| A4 | Low (informational) | `/` and `/inventory` use client-side redirects (brief intermediate render) instead of server headless redirects; behavior is correct. |

## 5. DB-backed surface (verified at HTTP level, `test-api.mjs`)

`/api/dashboard`, `/api/inventory`, `/api/auth/*`, `/api/auth/profile` — parameterized SQL, session auth, validation and error codes verified 400/401/200 as designed, including sign-out session invalidation and password-change re-auth.

## 6. Reconciliation

- Route discovery → inventory → no-auth matrix → auth matrix → browser render → interactions → persistence hooks: no unresolved gaps.
- Every route registered in `lib/nav.ts`/`lib/screens.ts` renders its intended screen with a signed-in session; every protected route is server-guarded at the middleware layer.

## 7. Recommended next actions

1. Decide + implement server-side RBAC (or explicitly accept auth-only for the intended single-operator deployment) — closes A1. **DONE 2026-09-07** (see `ROLES_AND_PERMISSIONS.md`).
2. Add a favicon — closes A2. **DONE 2026-09-07**.
3. Operator: approve merge `kartik-gohil` → `main`, then deploy `wrangler deploy` (Worker `ellington-worker`) with Cloudflare auth (`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` or `wrangler login`); seed production Neon — closes A3.
4. Optional: add custom `404.tsx`/`500.tsx`.