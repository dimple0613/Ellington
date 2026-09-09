# OneTask.md — CEO Task Tracker

> Live tracker. Updated by the CEO. An approved/completed task is marked here and
> reflected in the status digest. Legend: [ ] todo | [~] in progress | [x] done | [!] blocked

## Push (current branch + what to push)
> Branch-per-task rule (see AGENTS.md): never push directly to main. Update this section per task.

- Current branch: **`refactor/purge-static-data`** (made from `feat/audit-halfdone-completion`). Push target: this branch only.
- PUSH THIS (next commit, purge batch 1):
  - **All UI screen static/mock row purges** (14 screens): `components/screens/{AuditLog,Cashflow,Collections,Construction,Deeds,Escrow,Financials,Invoices,Payments,Pipeline,Reports,Sales,Snagging,Users}.tsx`.
- Also on branch (already committed, not pushed): wizard rewire commit `11a015c`, remaining-fabricated-data commit `0e53c6e`, and notification fix (Shell tray live-only, ticker dynamic, Preferences → Settings ?tab=notif, Mobile "Notifications" sub honest).
- NOT in commit (never): `docs/ARCHITECTURE.md`, `auto-push.ps1`, `test-*.mjs`, `dev.log`.
- Status: `npm run lint` (tsc --noEmit) **green**; `next build` **green** (dev server stopped during build, restarted, up on :3000).
- Prior task `feat/audit-halfdone-completion` (portals/unit-builder/pricing) is fully shipped on its own branch — historical, NOT in this commit. Demo portal logins: `buyer@example.com` / `broker@example.com`, `Portal123!`.

## Static data purge (purge-static-data)
> Goal: remove ALL UI mock/fallback rows so the operator can test every screen manually against the live DB.
> Rule applied: purge mock/fallback ROWS; KEEP option/config lists (status pills, enums, STAGE config,
> GROUPS report catalog, Settings defaults, Inventory VIEWS/CHIPS, Pricing option lists), empty-array
> fallbacks, and `pages/api/report-export.ts` FALLBACK (SQL config map). `db/seed.ts` seed data kept.

- [x] **Cashflow / Escrow / Collections / Invoices** — API-first; static rows emptied; empty states; Invoices duplicate `SOA_FIELDS` (fake values) removed.
- [x] **Payments** — `KPI_FALLBACK`/`payRows`/`fallbackPdc` removed; `record()` async (posts `project_code`, calls `loadReceipts()` after POST; local row uses honest placeholders); table = live rows + local POST echo only.
- [x] **Financials** — `REV_BARS`/`COMM_ROWS` emptied; header "position live"; empty states for chart + commissions table.
- [x] **Construction** — `PKG`/`MILES`/static `PHOTOS`/static `RISKS` removed; live-only pct/certs; empty states; `TEAM` kept as vendor config; toasts genericized.
- [x] **Pipeline** — `PIPE` cards/counts emptied (labels/colors kept), `BLOCKED`/`STAGE_DAYS`/`FORECAST` emptied; defaults blank; modal chips → text inputs; empty states.
- [x] **Reports** — `SCHEDULED` emptied; report cards "Live export ready"; board-pack date dynamic; `GROUPS` catalog kept.
- [x] **Deeds** — `ROWS` removed, `MOLLAK` emptied, `certUnit` blank; `doIssue` guarded; handover tile computed from rows.
- [x] **Snagging** — static `TRADES`/`ROWS` removed; `TRADES`/`maxTrade` computed live; KPIs live; `raiseSnag` guarded; unit chips → input.
- [x] **AuditLog** — static `ROWS` removed; count/filters live; error text fixed.
- [x] **Users** — static `USERS` fallback emptied; header count computed; empty-state; `ROLE_PERMS`/`THRESHOLDS_BASE`/`PLAIN` kept as role config.
- [x] **Sales** — dead `DEAL`/`refOf` removed; `BROK_FALLBACK` left (already all-empty, harmless).
- [x] **Sales booking wizard rewired to live data** (operator-approved) — deleted `SFIELDS` static step data; wizard now loads available units from `/api/inventory?status=available` (scoped to `?scope=`), unit picked in a live `<select>`, and `listPrice`/`psf`/`booking token`/`DLD` derived from the selected unit's `price`/`area`. `saveDraft`/`doConfirm` POST `unit_no` + `list_price` from the live unit; escrow/bank/ref defaults emptied (escrow is mandatory input before confirm); discount default 0 with live approval copy; step 2 identity fields honest ("Captured at KYC"/"—"/"Pending screening"); step 4 docs "Queued after confirmation"; deal rail + step-5 review + confirmed screen all live. Save-draft/continue disabled until a unit is selected.
- [x] **Notifications now fully dynamic** — Shell tray no longer seeded with 6 fabricated notifications (`NOTIFS` removed); tray/ticker built only from `/api/finance` (overdue >90d, unmatched escrow, drawdowns awaiting trustee, worklist), re-fetched on window focus; "Due today" fallback now `AED 0` instead of fake `AED 4.2M`; profile "Preferences · Notifications & quiet hours" opens Settings on the real Notifications tab (`?s=settings&tab=notif`); "Offline cache · Last synced 09:39" fake timestamp neutralized; Mobile "Notifications · 12 unread" fake count neutralized. Settings notification matrix already live (loads/merges/saves `app_settings.notif` via `/api/system`).
- [x] **Notification read/dismiss persists** — stable content-derived IDs (`collections-overdue`, `escrow-unmatched`, `drawdowns-awaiting`, `collections-worklist`) instead of ephemeral `n1/n2…`; mark-all-read + per-item dismiss now saved to `localStorage["ellington_notif_<userId>"]` (per admin) and applied on every rebuild, so unread state survives refresh. Client-side only — no schema/API change; per-user and per-device.

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