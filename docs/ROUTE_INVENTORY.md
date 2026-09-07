# Page & Route Inventory — Ellington ERP

Discovered from source (pages/, middleware.ts, components/Shell.tsx, lib/nav.ts, lib/screens.ts,
components/app/GroupPage.tsx, page router files). Generated for the full audit.

## 1. Top-level page routes (Pages Router)

| # | Route              | Page               | Access type           | Auth | Middleware            | Discovered from          |
| - | ------------------ | ------------------ | --------------------- | ---- | --------------------- | ------------------------ |
| 1 | `/`                | Home (redirect)    | Public → redirect     | No   | — (client redirect)   | pages/index.tsx          |
| 2 | `/login`           | Sign in            | Public (auth)         | No   | public-only rule      | pages/login.tsx          |
| 3 | `/forgot-password` | Forgot password    | Public (auth)         | No   | public-only rule      | pages/forgot-password.tsx|
| 4 | `/reset-password`  | Reset password     | Public (auth)         | No   | public-only rule      | pages/reset-password.tsx |
| 5 | `/dashboard`       | Portfolio group    | Authenticated         | Yes  | protected             | pages/dashboard.tsx      |
| 6 | `/project`         | Project group      | Authenticated         | Yes  | protected             | pages/project.tsx        |
| 7 | `/inventory`       | Redirect → project | Authenticated         | Yes  | protected             | pages/inventory.tsx      |
| 8 | `/sales`           | Sales group        | Authenticated         | Yes  | protected             | pages/sales.tsx          |
| 9 | `/finance`         | Finance group      | Authenticated         | Yes  | protected             | pages/finance.tsx        |
| 10| `/handover`        | Handover group     | Authenticated         | Yes  | protected             | pages/handover.tsx       |
| 11| `/system`          | System group       | Authenticated         | Yes  | protected             | pages/system.tsx         |
| 12| `/mobile`          | Executive app      | Authenticated         | Yes  | protected             | pages/mobile.tsx         |
| 13| `/profile`         | My profile         | Authenticated         | Yes  | protected             | pages/profile.tsx        |
| 14| `/<anything>`      | 404                | System error (default)| No   | —                     | no custom 404.tsx        |

## 2. API routes

| # | Method | Route                          | Auth    | Discovered from              |
| - | ------ | ------------------------------ | ------- | ---------------------------- |
| 1 | POST   | `/api/auth/login`              | Public  | pages/api/auth/login.ts      |
| 2 | POST   | `/api/auth/logout`             | Session | pages/api/auth/logout.ts     |
| 3 | GET    | `/api/auth/me`                 | Session | pages/api/auth/me.ts         |
| 4 | PUT    | `/api/auth/profile`            | Session | pages/api/auth/profile.ts    |
| 5 | POST   | `/api/auth/forgot-password`    | Public  | pages/api/auth/forgot-password.ts |
| 6 | POST   | `/api/auth/reset-password`     | Public  | pages/api/auth/reset-password.ts  |
| 7 | GET    | `/api/dashboard`               | Session | pages/api/dashboard.ts       |
| 8 | GET    | `/api/inventory`               | Session | pages/api/inventory.ts       |

## 3. Query-param sub-screens (views within a top-level page)

| # | Full route                              | Screen                | Group     | Dynamic?      |
| - | --------------------------------------- | --------------------- | --------- | ------------- |
| 1 | `/dashboard` (no s)                     | Portfolio position    | portfolio | —             |
| 2 | `/dashboard?s=projects[&scope=]`        | Projects grid         | portfolio | —             |
| 3 | `/dashboard?s=financials[&scope=]`      | Financials            | portfolio | —             |
| 4 | `/dashboard?s=cashflow[&scope=]`        | Cashflow forecast     | portfolio | —             |
| 5 | `/dashboard?s=reports[&scope=]`         | Reports & export      | portfolio | —             |
| 6 | `/project?s=inventory&scope=CODE`       | Inventory             | project   | scope          |
| 7 | `/project?s=pricing&scope=CODE`         | Pricing & availability| project   | scope          |
| 8 | `/project?s=construction&scope=CODE`    | Construction          | project   | scope          |
| 9 | `/project?s=unit&unit=ID&scope=CODE`    | Unit detail           | project   | unit (dynamic) |
| 10| `/sales?s=leads[&scope=]`               | Leads kanban          | sales     | scope          |
| 11| `/sales?s=booking[&scope=]`             | Booking wizard        | sales     | scope          |
| 12| `/sales?s=buyer[&scope=][&name=]`       | Buyer 360             | sales     | name (dynamic) |
| 13| `/sales?s=brokers[&scope=]`             | Brokers & agencies    | sales     | scope          |
| 14| `/sales?s=documents[&scope=]`           | Documents             | sales     | scope          |
| 15| `/finance?s=payments[&buyer=]`          | Payments              | finance   | buyer (dynamic)|
| 16| `/finance?s=collections`                | Collections           | finance   | —             |
| 17| `/finance?s=escrow`                     | Escrow                | finance   | —             |
| 18| `/finance?s=invoices`                   | Invoices              | finance   | —             |
| 19| `/handover?s=pipeline`                  | Handover pipeline     | handover  | —             |
| 20| `/handover?s=snagging`                  | Snagging              | handover  | —             |
| 21| `/handover?s=deeds`                     | Title deeds           | handover  | —             |
| 22| `/system?s=users`                       | Users & roles         | system    | —             |
| 23| `/system?s=settings`                    | Settings              | system    | —             |
| 24| `/system?s=audit`                       | Audit log             | system    | —             |
| 25| `/mobile?s=mobile`                      | Executive app         | mobile    | —             |

## 4. Roles & permissions

- DB role field: single seeded admin `super_admin` (no admin CRUD API). Session only stores
  userId/email/role/full_name.
- Middleware enforces **authentication only** — there is NO server-side role/per-route restriction.
  Role labels in Shell ("Super Admin/Editor/Admin") are cosmetic; the System → Users permission
  matrix is client-side mock UI, not enforced.
- Implication for audit: a logged-in user has full access to every protected route. The
  "restricted pages" category therefore reduces to an auth-required/auth-public matrix, plus
  verifying no server-side role check is needed/bypassed.

## 5. Coverage summary

- Top-level page routes: 14 (1 redirect, 3 public-auth, 9 protected, 1 system 404)
- Auth API routes: 8 total (3 public, 5 session-guarded)
- Query sub-screens: 25
- Dynamic params: `?scope=` (project code), `?unit=` (unit id), `?name=` (buyer), `?buyer=` (buyer)
- Hidden / non-nav routes: `/inventory` (redirect), `/project?s=unit&unit=` (unit detail),
  `/sales?s=buyer&name=` (buyer 360 via Cmd+K), `/finance?s=payments&buyer=` (record payment),
  `/` (home redirect)
- Error pages: default Next.js 404 (no custom 404/500/_error)