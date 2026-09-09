# OneTask.md — CEO Task Tracker

> Live tracker. Updated by the CEO. An approved/completed task is marked here and
> reflected in the status digest. Legend: [ ] todo | [~] in progress | [x] done | [!] blocked

## Push (current branch + what to push)
> Branch-per-task rule (see AGENTS.md): never push directly to main. Update this section per task.

- Current branch: `fix/parity-live-data` (PLINTH parity — verified remaining gaps). Push target: this branch only.
- Pushed (ALL SIX): **D1** `728b479` · **D2** `bf3f350` · **D3** `0c94935` · **D4** `57adfdd` · **D5** `bc4f84f` · **D6** `31ff7aa` · tracker `79fbe32` · audit-vs-reference findings `<commit>`.
- Everything intended for this task is on this branch — NO commit on `main` from this program.
- Prior `fix/plinth-parity` commits (T1–T18) are historical and NOT completion evidence.

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
- [ ] **Settings extra tabs** (Financial/Templates/Data) — `Settings.tsx:6` has 5 tabs
      (Company/Numbering/Notifications/Integrations/Other). Visual change → AGENTS.md approval required.
- [ ] **`lib/data.ts` mock purge** (`POS :22-29`, `BUYERS :31-44`, `PROJECTS :60-66`, `UNITS :84-122`)
      — retained as offline fallback; every screen above is API-first.

## Dynamic audit vs reference — confirmed findings (09 Sep 2026)
> Full evidence: `docs/AUDIT-VS-REFERENCE.md` (committed with this entry).
> 62 pass / 12 fail then code+DB verification of every fail. Baseline harnesses still green.

- [ ] **BUG: Payments Collected today / MTD always AED 0** even with receipts today (ids 43/44, `09 Sept 26`).
      Root cause `pages/api/receipts.ts:37,42` `en-GB` month `"Sept"` (4 letters) vs
      `Payments.tsx:126` regex expecting 3-letter → `parseD` null → 0. Also cosmetic `"Sept"` in tables.
- [ ] **Gap: Settings** — 5 tabs only; reference needs Financial/Templates/Data (Data folds retention/
      export schedules/IP allow-list/SSO). Was deferred; still needs operator approval.
- [ ] **Gap: Audit Log** — live data present but no expandable before→after diff rows and no date-range/
      actor filters (`before_val`/`after_val` columns already exist).

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