# OneTask.md — CEO Task Tracker

> Live tracker. Updated by the CEO. An approved/completed task is marked here and
> reflected in the status digest. Legend: [ ] todo | [~] in progress | [x] done | [!] blocked

## Push (current branch + what to push)
> Branch-per-task rule (see AGENTS.md): never push directly to main. Update this section per task.

- Current branch: `feat/audit-halfdone-completion` (complete amber "Half-finished" audit items). Push target: this branch only.
- PUSH THIS:
  - **`c4fa370`** "feat(audit): buyer + broker portals (external, invite/enable from Sales)" (11 files: lib/portal.ts, lib/session.ts, lib/mail.ts, pages/api/portal/{buyer,broker}.ts, pages/portal/{buyer,broker}.tsx, components/portal/{PortalChrome,BuyerPortalInvite,BrokerPortalEnable}.tsx, components/screens/Sales.tsx).
  - **`d2abe81`** "feat(audit): new project wizard + bulk unit builder + pricing manager" (11 files: components/app/ProjectWizard.tsx, components/screens/{Projects,UnitBuilder,Pricing}.tsx, components/Shell.tsx, pages/api/{projects,unit-builder,pricing}.ts, pages/project.tsx, lib/screens.ts, db/schema.sql).
  - Prior **`0c36607`** (amber items: Reports/notif/approvals/mobile/tokens) already recorded; all on this branch.
- Lint (`npx tsc --noEmit`) + `next build` green (build run with dev server stopped, then restarted). Smoke-tested live: unit-builder generate (inserted 4), pricing preview→submit→approve (6 units, revision applied), buyer portal login + data (units/schedule/docs), broker login + reserve (reservation created). Demo portal logins seeded in dev DB: `buyer@example.com` / `broker@example.com`, password `Portal123!`.
- Audit HTML updated: `C:\Users\admin\Downloads\New folder\ELLINGTON-AUDIT-REPORT.html` — **all 5 remaining MISSING cards flipped to DONE** (New Project wizard, Unit Builder, Pricing &amp; availability manager, Buyer portal, Broker portal); only 24 DONE cards remain (release-phases + compliance checkboxes also ticked).
- Everything intended for this task is on this branch — NO commit on `main` from this program.
- Prior `fix/plinth-parity` and `fix/parity-live-data` commits (T1–T18, D1–D6) are historical and NOT completion evidence for this task.

## PLINTH Parity Program — verified remaining tasks
> Re-audited from scratch against `C:\Users\admin\Downloads\New folder\plinth-prompt-pack_1.html`
> (audit runs Apr 2026 by 4 explore agents + direct file reads). The "all 18 done, 23/23 PASS"
> narrative in git history is NOT trusted; every item below is a CONFIRMED gap with `file:line` evidence.

### P1 — Dashboard / Leads (highest user-visible value)
- [x] **D1 Dashboard live KPIs** — `pages/api/dashboard.ts` now computes kpis/ageing/forecast/attention/
      velocity from tables (receipts, collections, invoices, payment_milestones, bookings, escrow_ledger,
      deeds, units, projects, leads); `pages/dashboard.tsx` consumes new payload with computed
      `fallbackDash()` on API failure. Committed `728b479`.
- [x] **D2 Leads detail drawer** — clicking a lead card opens a `LeadDrawer` (contact/deal/activity,
      stage pill, "Convert to booking" CTA that prefills the wizard); drag-move gates on missing
      name/budget for qualifying stages with amber notice. Committed `bf3f350`.

### P2 — Inventory / Shell
- [x] **D3 Inventory context** — scopeName derived from `/api/inventory` projects list; building tab pills
      switch `?scope=`; summary strip (units/available/total value/avg psf) and filter chips computed from
      loaded units instead of static CHIPS. Committed `0c94935`.
- [x] **D4 Shell live** — "Due today" ticker + notification tray rebuilt from `/api/finance`
      (overdue >90d collections, unmatched escrow, drawdowns awaiting trustee, worklist count); ORN
      subtitle reflects current scope. Committed `57adfdd`.

### P3 — Finance / Sales stats
- [x] **D5 Finance KPIs** — Payments KPIs (today/MTD/cheques pending/unreconciled/bounced) computed from
      receipts already loaded; Collections age buckets + subtitle derived from live rows. Committed `bc4f84f`.
- [x] **D6 Sales stats** — funnel counts + avg days-to-close + per-stage conversion + header
      (open/potential/agents) computed from live leads; leaderboard was already live. Committed `31ff7aa`.

### Deferred / N/A (needs operator approval — NOT started)
- [ ] **`lib/data.ts` mock purge** (`POS :22-29`, `BUYERS :31-44`, `PROJECTS :60-66`, `UNITS :84-122`)
      — retained as offline fallback; every screen above is API-first.

## Dynamic audit vs reference — confirmed findings (09 Sep 2026)
> Full evidence: `docs/AUDIT-VS-REFERENCE.md` (committed with this entry).
> 62 pass / 12 fail then code+DB verification of every fail. Baseline harnesses still green.

- [x] **BUG: Payments Collected today / MTD always AED 0** even with receipts today (ids 43/44, `09 Sept 26`).
      Root cause `pages/api/receipts.ts:37,42` `en-GB` month `"Sept"` (4 letters) vs
      `Payments.tsx:126` regex expecting 3-letter → `parseD` null → 0. Fixed `6179180` via `fmtShortDate`
      (`lib/format.ts`) used in receipts + statements APIs. Verified: today AED 38.02M/13 receipts,
      MTD AED 208.40M/39 receipts. Also matches reference `24 Aug 26` date style.
- [x] **Gap: Settings** — now 7 tabs incl. Financial (FX rates + refresh, VAT/fiscal, banks w/ escrow),
      Templates (EN/AR library, merge fields, preview, test-send, activate/draft) and Data (retention, PII,
      backup, JSON export); Numbering + Booking/Invoice/Quote rows w/ live preview; stored vars merged over
      defaults on load. Approved + verified live, committed `02fbe52`.
- [x] **Gap: Audit Log** — added expandable rows (before→after field-diff panel, red→green), date-range +
      actor + action + project filters, high-sensitivity toggle, Clear filters, append-only banner, live
      count, Export CSV (client-side over live `/api/system` rows). Verified live, committed `02fbe52`.

## Working baseline (verified in code, NOT re-litigated)
- Live DB-backed today: receipts (create/PDC/import), invoices (issue/void/bulk), collections, escrow,
  pipeline/snagging/deeds, users/settings (`app_settings` numbering+notif)/audit log, brokers, bookings,
  documents, inventory + unit detail, construction milestones, leads stage PUT.
- Schema tables present: admins, role_permissions, documents, document_templates, escrow_ledger,
  pipeline_items, receipts, bank_statements, collections, drawdowns, invoices, construction_milestones,
  app_settings, leads, buyers, bookings, broker_*, audit_log, snag_items, deeds, password_resets.
- Baseline regression harnesses: `verify_functionality.js` + `verify_responsive.js` (in
  `C:\Users\admin\AppData\Local\Temp\opencode\`) — rerun with local creds `admin@gmail.com`/`Admin123`.
  Final run on this branch (Chrome CDP :9229): **responsive 70/70 ALL PASSED**; functionality **86/89** with
  3 stale marker mismatches (NOT regressions): `buyer renders` expects mock name "Rajesh" but Buyer screen
  now shows live DB buyers; `shell profile` expects operator "Rania Mansour" but actual logged-in admin is
  "Super Admin"; `login renders` marker flaked once on load timing (passed in the 1st run).
- Local dev data caveats (honest, live): H21 has 0 confirmed bookings in 84d (velocity bars zero);
  receipts MTD-driven KPIs reflect actual seed dates; collections buckets reflect 8 seeded rows.

## Rules reminder (AGENTS.md)
- Inline styles only; design tokens from `lib/format.ts`; no Tailwind/shadcn/deps without approval.
- Parameterized SQL only (`$1`…); server-side `withSession` + `withPerm` on every API route.
- `npm run lint` (tsc) + `npm run build` green before push. Never push to main.