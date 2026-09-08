# AGENTS.md — Agent Guidance

Development rulebook for **Ellington ERP**, a Next.js + PostgreSQL (Neon) ERP console.
Reference UI: `Archive/UI systems design review/Ellington ERP.dc.html`.

## Stack (pinned — do not upgrade)
- Next.js **15.5.25**, **Pages Router only** (no `app/` dir). React **19.2.8**. TypeScript **5.9.3** (strict).
- Data: `pg` + `@neondatabase/serverless` (`lib/db.ts`). Production runs through Cloudflare **Hyperdrive**
  (binding `b9057aad7125418589f900050b753284`); local uses a plain Postgres URL.
- Styling: **inline styles only** — design tokens from `lib/format.ts` (`AC` accent, `money`, `compact`).
  Cards are white, radius 20; buttons radius 12; accent `#4F46F5`. Fonts: Plus Jakarta Sans + JetBrains Mono
  (`pages/_document.tsx`). There is **no Tailwind, no shadcn/ui, no CSS-in-JS library** — do not introduce one.
- PDFs: `jspdf` + `jspdf-autotable` (`lib/pdf.ts`). Mail: `nodemailer` (`lib/mail.ts`).
- There are **no runtime form libraries**: Formik/Yup were removed as dead deps. Forms use local state + manual
  validation. Adding a dependency requires operator approval.

## Conventions
- Design tokens only; match the look exactly (no visual/UI-look changes without explicit approval).
- Parameterized SQL only (always `$1`… placeholders via `query()`). Never interpolate user input into SQL.
- No secrets committed. `.env*`, `*.local`, `backups/`, `.vercel/` are git-ignored. `.env.example` ships
  generic/example values only.
- Server-side auth on **all** API routes: wrap with `withSession(...)` (session as 3rd handler arg — never
  `req.session`) and gate with `withPerm(module, action, handler)` or `hasPerm`. Sessions are signed
  (`JWT_SECRET`) and fail closed in production — never add a "debug" bypass.
- One task at a time; update `OneTask.md` status per task (Push section = current branch + exactly what to push).
- Edge-safe imports: `middleware.ts` + `lib/permission-map.ts` must not pull in `pg`/Node-only modules.

## Architecture map
- `pages/` — 16 pages (Routes Router). Group pages: `dashboard` (portfolio), `project`, `finance`, `handover`,
  `sales`, `system`, `mobile`. Auth pages: `login`, `forgot-password`, `reset-password`, `profile`, plus
  `403.tsx`/`404.tsx`.
- `pages/api/` — 13 routes, all prefixed `/api`: `auth/{login,logout,me,profile,forgot-password,reset-password}`,
  `admins`, `dashboard`, `inventory`, `leads`, `milestones`, `projects`, `receipts`.
- `components/` — `Shell.tsx` (nav + session guard), `app/GroupPage.tsx` (group layout + `Stub`),
  `app/Stub.tsx` (shared placeholder), `screens/*.tsx` (20 screens; wired ones fetch `/api/*`, the rest are
  static-first and fall back to `lib/data.ts` mocks).
- `lib/` — `db.ts` (pooled Hyperdrive / local `pg`), `session.ts` (JWT sign/verify, cookie helpers, `withSession`),
  `permissions.ts`/`permission-map.ts` (RBAC), `format.ts`, `screens.ts`, `nav.ts`, `pdf.ts`, `mail.ts`,
  `auth.ts` (hashing/tokens), `data.ts` (mocks), `useSession.ts`, `useWindowSize.ts`.
- `db/` — `schema.sql`, `seed.ts` (initial admin + RBAC rows), `reset.ts`. Scripts run with `npx tsx` (no psql/neonctl).
- `docs/` — API_REFERENCE, AUDIT_COVERAGE, AUTH_FLOW, DATABASE, DEPLOYMENT, ROLES_AND_PERMISSIONS,
  ROUTE_INVENTORY, TESTING_STRATEGY, ARCHITECTURE. Add your finding to `ARCHITECTURE.md` when you discover one.

## Database & environment
- Production data is **live Neon** — never tamper with it. Dev goes through `db/seed.ts`/`reset.ts`.
- Required env (see `.env.example`): `DATABASE_URL`, `JWT_SECRET` (hard-required in production), optional SMTP_*.
- Admin id 1 on Neon: `Dipin Ellington` (super_admin). Local dev seed default is `admin@gmail.com`.

## Branching & Push (MANDATORY)
- Never commit/push directly to `main` for a task.
- Before starting a task, create the branch: `git checkout -b <task>` (e.g. `feat/fix-invoices`).
- Do all work on that branch; commit there; push that branch (NOT main).
- Record the current branch + exactly what to push in `OneTask.md` (Push section) so only intended code reaches git.
- Merge/PR to `main` only after operator approval.

## Commands
- `npm run dev` — local dev server
- `npm run lint` — typecheck (`tsc --noEmit`)
- `npm run build` — production build (Next)
- `npm run build:cf` — OpenNext/Cloudflare build (only intended for deploy machines with Node 22)
- DB scripts: `npx tsx db/seed.ts` / `npx tsx db/reset.ts`
- Browser verification harnesses live outside the repo (Playwright MCP / CDP scripts).

## Safety
- If a change risks breaking the UI look, the API contract, or secrets, stop and ask the operator first.
- `verify_functionality.js` (89/89) and `verify_responsive.js` (70/70) are the regression baselines.

## Tracking
- Track status in `OneTask.md`; approvals close the corresponding GitHub issue.
- GitHub audit work is managed via `AUD-xxx` issues (#20–#34) and the "Full Project Audit" board
  (columns: Not Checked / Failed / Fixing / Fixed / Retesting / Passed).