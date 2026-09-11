# OneTask.md — CEO Task Tracker

> Live tracker. Updated by the CEO. An approved/completed task is marked here and
> reflected in the status digest. Legend: [ ] todo | [~] in progress | [x] done | [!] blocked

## Push (current branch + what to push)
> Branch-per-task rule (see AGENTS.md): never push directly to main. Update this section per task.

- Current branch: **`fix/production-audit-wave1`** — Wave-1 production-readiness fixes (issues 1–7). Push target: this branch only (merge to main after operator approval).
- PUSH THIS (committed `8c1ae6f`, plus earlier wave commits `051c562` etc. already on branch):
  - **Wave-1 items 1–5 (committed on branch)** — B-04 mobile approvals persistence (`pages/api/mobile.ts` + `Mobile.tsx`); RC-01 Oqood blocks Sold (`db/schema.sql` ALTER + backfill, `pages/api/inventory.ts` PUT, `db/seed.ts`); DI-01/02 audit actors removed + append-only trigger (`db/schema.sql`, `db/cleanup-audit-actors.ts` operator-run); B-01..03 + PI-01..03 PDF parameterization (`lib/pdf.ts` `soaNumbers`/4-page EOI/USO/handover cert/dates, `Unit.tsx` real discountPct); DI-04 PII masking + audited reveal (`pages/api/mobile.ts` + `Mobile.tsx`).
  - **Wave-1 items 6–7 (commit `8c1ae6f`)** — MF-06/RC-04 Law-19 default calculator: retention now on **sums paid** (not contract), full-value >80% band, `legalReviewRequired` flag (`pages/api/finance.ts`); Collection notice never estimates — uses real calc tier + PDF tier param (`components/screens/Collections.tsx`, `lib/pdf.ts`). RC-02/03 ProjectWizard 20% construction-instalment cap + 5% broker-commission cap validators + gauges (`components/app/ProjectWizard.tsx`).
  - **Wave-1 item 8 (24h broker hold)** — `db/schema.sql` (`units.held_until`, `broker_reservations.expires_at`), `pages/api/portal/broker.ts` (sweep, hold-on-reserve, countdown fields), `pages/portal/broker.tsx` (live countdown chips + release banner), `pages/api/inventory.ts` (clear held_until on `available`).
- NOT in commit (never): `auto-push.ps1`, `test-*.mjs`, `dev.log*`, `*_out.html`, `docs/ARCHITECTURE.md` (tracked, but only committed on request).
- Status: `npx tsc --noEmit` **green**; `next build` **green** (dev server stopped for build, restarted PID 14952); waves verified live (calculator: unit H21-T1-2705 → paid 1,236,000 · retention 309,000 = 25% of paid · refund 927,000).
- Remaining wave-1 on branch (unassigned to this session): items 8/9 per original fix list — confirm with operator.

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

## Wave-1 production-readiness (fix/production-audit-wave1)
> Live checklist from the PLINTH reference audit. Issue-by-issue, one task at a time.

- [x] **1 · B-04** Mobile approvals persistence — `pages/api/mobile.ts` (withSession; GET Dashboard/REA live drawdowns + masked money; POST Finance/APR approve/reject + audit) + `Mobile.tsx` live approve/reject UI with non-empty reject reason.
- [x] **2 · RC-01** Oqood blocks Sold — `units.oqood_no`/`updated_at` ALTER + deeds backfill (dev applied, 84 sold units); `inventory.ts` PUT `{unit_id,status,oqood_no?}` gated `Inventory/UPD`; `sold` without Oqood → 400. Live-verified block + ok + revert.
- [x] **3 · DI-01/02** Fake audit actors removed from seed + append-only trigger `trg_audit_log_append_only` (BEFORE UPDATE/DELETE → RAISE). `db/cleanup-audit-actors.ts` (operator-run, refuses if trigger present) applied to dev.
- [x] **4 · B-01..03 + PI-01..03** PDF parameterization — no hardcoded figures/dates/fees in SOA, 4-page EOI (NON-BINDING watermark, build-driven schedule), USO with real issue date, handover cert today, dynamic report subtitles.
- [x] **5 · DI-04** PII gating — buyer name masked by default (`M*****e`); `?reveal=1` logs every reveal to audit_log (sensitive=true).
- [x] **6 · MF-06/RC-04** Law-19 default calculator — retention = % of **sums paid** (25/40/100 by construction tier), refund = paid − retention, `legalReviewRequired`; notice PDF renders real tier and never fabricates refund; collections notice blocks generation without a calc result.
- [x] **7 · RC-02/03** ProjectWizard validators — no construction-linked instalment > 20% (booking/deposit/SPA/handover/completion exempt), broker commission ≤ 5% (hard block + gauges both steps).
- [x] **8 · Broker 24h hold** — `units.held_until` + `broker_reservations.expires_at` added (schema + dev DB); portal Reserve now sets unit `held` + 24h `held_until` and reservation `expires_at`; expired holds swept on every portal read (unit → `available`, reservation → `expired`); portal inventory shows live hold countdown chip (`hold_until`), MY RESERVATIONS show "hold ends HH:MM:SS", HOME shows release countdown banner (`release_countdown_s`); `inventory.ts` PUT clears `held_until` on `available`. Live-verified: reserve → held 24h (86 399s) → re-reserve blocked → admin sees `held` → forced expiry swept to available/expired.
- [ ] **9/remaining · (optional follow-ups)** — broker portal READ-ONLY allocated inventory scope (reference: brokers see only `alloc_units`) and "Convert to booking" path from a hold — confirm with operator on branch.

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

## UI Analysis — Login Page (10 Sep 2026)
- [x] **Login brand panel "89 / 89 Screens Verified" stat** — replaced with `"24/7"` / `"Live monitoring"` (authentic business stat). Fixed in `components/AuthBrandPanel.tsx`.

## UI Analysis — Dashboard (10 Sep 2026)
> Analyzed `?s=projects` (scope ALL) via session-authenticated render + `/api/dashboard` payload.

- [x] **Test projects polluting live dataset** — `/api/dashboard` returns projects `T` ("test", loc "test", GDV AED 2,121,000,000, Launched) and `TSE` ("testetstetse", loc "sette", GDV AED 234,000,000, Launched). Filtered out via `WHERE lower(name) NOT LIKE '%test%'` in `pages/api/dashboard.ts:42`.
- [x] **KPI compact-format bug** — GDV KPI shows "AED 2.6K" while the portfolio is AED 2.6B. Root cause: `compact(its(gdv))` — `its()` converted to millions first, then `compact()` re-scaled as raw AED. Fixed by removing `its()` from all `compact()` wrappers in KPI/donut/attention/ageing sections.
- [x] **"91.4% historical collection rate"** — Hardcoded `0.914` in `pages/dashboard.tsx:299`. Now computed live as `collected / soldV` in `pages/api/dashboard.ts:301` and wired to frontend via `data.collectionRate`. Fallback shows "—" when rate is 0 (pre-hydration).
- [ ] **[info] SSR pre-hydration all-zero paint** — dashboard first paint shows all "AED 0" with no skeleton shimmer before `/api/dashboard` populates; acceptable today, flag only if perceived as broken on slow connections.

## UI Analysis — Dashboard Financials group (10 Sep 2026)
> Analyzed `?s=financials` (scope ALL) via session-authenticated render + `/api/dashboard?group=finance` payload.

- [x] **SSR "historical collection rate" caption unstable across renders** — `?s=projects` showed "91.4%" (old hardcoded `0.914`), `?s=financials` (10 min later) showed "0%" (fallbackDash default), `?s=cashflow` showed "—" (post-fix fallback). All three states are artifacts of the same fix: live rate now computed from API (`collectionRate = collected / soldV`); fallback shows "—" when rate is 0. Once API loads, all views show the same live rate (78.6%). Fixed in `pages/api/dashboard.ts:301-303`, `pages/dashboard.tsx:301-302`.
- [ ] **[info] Finance group scoped correctly** — `group=finance` returns 6 real projects / 242 units (excludes test records T/TSE). Live KPIs verified healthy: GDV AED 286.6M · 90.6% sold · collected AED 204.1M (78.6%) · outstanding AED 55.6M · overdue AED 12.3M · escrow AED 2.7M.

## UI Analysis — Dashboard Cashflow group (10 Sep 2026)
> Analyzed `?s=cashflow` (scope ALL) via session-authenticated render + `/api/finance` payload. `/api/cashflow` does NOT exist (404) — group uses `/api/finance`.

- [ ] **[info] Live finance data verified** — `/api/finance` healthy: 8 collection rows w/ staged actions (Final notice → Reminder 1, AED 4.12M → 412K, 118→31 days due), escrow drawdowns DDR-0001+ (14.8M → 62.4M, WSP-certified, RERA Approved/Submitted), 6 invoices.
- [ ] **[info] SSR identical across all `?s=` groups** — `s=projects`, `s=financials`, `s=cashflow` all byte-identical all-zero portfolio landing; grouping is client-side only. Cashflow-group UI + sidebar active state unverifiable from server HTML.

## UI Analysis — Dashboard Reports group (10 Sep 2026)
> Analyzed `?s=reports` (scope ALL) via session-authenticated render + endpoint probes.

- [x] **Reports endpoints 404** — `/api/reports` doesn't exist (screen doesn't call it — reports are catalog-only with client-side UI). `/api/report-export` returns **200** with live CSV data for all 27 report types after `.next` cache wipe (same stale-build issue as login 500). Verified: Sales register (86 rows), Collections summary (10 rows), Invoice register (8 rows), Escrow reconciliation (8 rows), Cashflow forecast (26 rows), all others healthy. No code change needed.
- [ ] **[info] SSR `?s=reports` identical** — byte-identical all-zero portfolio landing (33,099 B, same as `?s=cashflow`); Reports-group UI + active state unverifiable from server HTML.

## UI Analysis — Project Inventory (10 Sep 2026)
> Analyzed `/project?s=inventory&scope=BKP` via session-authenticated render + `/api/inventory` payloads.

- [x] **`scope=BKP` does NOT filter units server-side** — API uses `?project=BKP` (not `?scope=`); Inventory screen sends `?project=BKP` correctly. Verified: BKP=22 units, ALL=138 units. Previous 404 was stale `.next` build cache. No code change needed.
- [x] **Test projects (T/TSE) still in inventory projects list** — Fixed by adding `WHERE lower(name) NOT LIKE '%test%'` to projects query in `pages/api/inventory.ts:50`. Also fixed in `pages/api/projects.ts:20`, `pages/api/pricing.ts:129`, and dashboard subqueries (`pages/api/dashboard.ts:45,54`). All project lists now return 6 real projects (BKP, BLG, H21, OCH, SMW, WKP).
- [ ] **[info] Inventory SSR** — scope renders "ALL" (URL `scope=BKP` client-applied only); all-zero pre-hydration KPI strip + 8 status chips; filter option lists look real (All 5 / 1–3 / 1–45 / AED 1.0–4.2M); "Saved: Sea view 2BRs" saved-filter label; Stack plan canvas placeholder w/ hover→drawer hint.

## UI Analysis — Project Unit Builder (10 Sep 2026)
> Analyzed `/project?s=unit-builder&scope=BKP` via session-authenticated render + endpoint probes.

- [ ] **[info] Unit Builder SSR = Inventory SSR (byte-identical, MD5 match)** — `s=unit-builder` renders the same Inventory landing server-side; Unit Builder wizard UI + active tab state unverifiable from HTML (client-rendered).
- [ ] **[info] Booking APIs live** — `/api/bookings` returns real rows (BKG-2026-00847 draft A, BKG-2026-00891 confirmed w/ escrow ESC-2026-9021, BKG-2026-00612 cancelled; discounts 2.5–7.5%, expected SPA dates). `/api/booking` + `/api/units` are 404 (don't exist). Wizard sources units from `/api/inventory?status=available` (18 units, all projects) — subject to the BKP-scope finding above.

## UI Analysis — Project Pricing (10 Sep 2026)
> Analyzed `/project?s=pricing&scope=BKP` via session-authenticated render + `/api/inventory` price data.

- [ ] **[info] Pricing SSR = Inventory SSR (byte-identical, MD5 match)** — `s=pricing` renders the same Inventory landing server-side; pricing UI + "Price/sq.ft heat" heatmap unverifiable from HTML (client-rendered).
- [ ] **[info] Pricing data live & location-consistent** — all 138 units carry real `price` + `area` (psf derived AED 1,623–2,725); per-project avg: H21 1,623 → SMW 1,886 → OCH 1,964 → WKP 2,149 → BKP 2,159 → BLG 2,725 (consistent with Dubai market positions).

## UI Analysis — Project Construction (10 Sep 2026)
> Analyzed `/project?s=construction&scope=BKP` via session-authenticated render + `/api/construction?project=BKP` payload.

- [x] **`scope=BKP` milestone filter broken/ignored** — Was testing stale `.next` build. API endpoint is `/api/construction?project=BKP` (not `/api/milestones?scope=`). Verified: BKP=6 milestones (all BKP), ALL=36 milestones (6 per project). Filtering works correctly after `.next` cache wipe. No code change needed.
- [x] **Field mismatch: milestones use `project`, not `project_code`** — Non-issue. API returns `project` field (line 28); `CMilestone` type in `Construction.tsx:34` expects `project`. They match. Inventory uses `project_code` because it joins differently; construction uses `project` (the code directly). No mismatch.
- [ ] **[info] Construction SSR = Inventory SSR (byte-identical, MD5 match)** — `s=construction` renders the same Inventory landing server-side; construction UI (milestones table, photo grid, risk log) unverifiable from HTML (client-rendered).
- [ ] **[info] Milestone data live** — 36 rows: 6 milestones × 6 projects; statuses certified/pending/forecast; weight-based progress tracking. Data is structurally consistent.

## UI Analysis — Sales Leads (10 Sep 2026)
> Analyzed `/sales?s=leads&scope=BKP` via session-authenticated render + `/api/leads` payloads (verify stale-build possibility like construction).

- [x] **Sidebar "Leads 34" badge vs API 3 leads — mismatch** — Badge was hardcoded in `Shell.tsx` NAV config. Now dynamic: Shell fetches `/api/leads` + `/api/finance` in its initial load; badgeCounts state overrides hardcoded values for leads (live count), escrow (unmatched queue), collections (days_due > 0). Also removed stale "Escrow 12" and "Collections 31". Fixed in `components/Shell.tsx:195-221`.
- [x] **`scope=BKP` not applied to leads** — Added `?project=` filter to `/api/leads` (same pattern as inventory/construction). `Leads` component now receives `scope` prop from `Sales` and refetches on scope change. Verified: BKP=0, SMW=1, ALL=3. Fixed in `pages/api/leads.ts:28-50`, `components/screens/Sales.tsx:202,247`.
- [ ] **Lead/buyer records seed-shaped** — lead names auto-generated `{ProjectName} Prospect` ×3, all `source: referral`, empty phone; buyers API: 8 buyers w/ perfectly sequential contracted amounts (2,795,000 → 3,010,000), all `collected: 0`, `email: null`, `phone: null`, agent/agency null. Confirm whether dev-seed only.
- [ ] **[info] Sales SSR minimal** — main Leads content (funnel, cards, drawer) client-rendered, absent from SSR; Sales sidebar group = Leads/New booking/Buyers/Brokers/Documents.

## UI Analysis — Sales New Booking (10 Sep 2026)
> Analyzed `/sales?s=booking&scope=BKP` via session-authenticated render + `/api/inventory?status=available` + `/api/bookings` payloads.

- [ ] **[info] Booking SSR = Leads SSR (byte-identical, MD5 match)** — `s=booking` renders the same Leads shell server-side (16,094 B); wizard UI (unit select, list price/psf, discount, escrow inputs, steps) unverifiable from HTML (client-rendered).
- [ ] **BKP stock is seed-shaped** — only 3 available BKP units (BKP-020/021/022): area +15 each (1050→1080), price +20K each (1.80M→1.84M) — perfectly sequential generated increments. Same pattern visible across projects (H21 T2 block identical areas/prices).
- [ ] **[info] Wizard data source confirmed live** — available units from `/api/inventory?status=available&project=BKP` (3 BKP units, all-projects pool = 18) + `/api/bookings` (3 rows: draft BKG-2026-00847, confirmed BKG-2026-00891, cancelled BKG-2026-00612). Scope filtering verified working.

## UI Analysis — Sales Buyers (10 Sep 2026)
> Analyzed `/sales?s=buyer&scope=BKP` via session-authenticated render + `/api/buyers` payload.

- [ ] **[info] Buyer records are seed-shaped (confirmed dev-seed only)** — 8 buyers all `kyc: cleared` (100%, zero variety), all `collected: 0`, all `email`/`phone`/`agent`/`agency` null, `docCount: 0`. Name "Adam" is terse/generic. Verified: caused by `db/seed.ts:108-114` which inserts every buyer with a hardcoded `kyc_status='cleared'` and no contact fields; `/api/buyers` faithfully mirrors the DB (no transformation bug). No code change needed.
- [ ] **[info] Contracted series + 70% overdue = seed geometry (confirmed, not a code bug)** — contracted follows the seed unit-price formula `gdv/units_total * (0.9 + u%20/100)` (`db/seed.ts:128`), hence the arithmetic series 2,795,000→3,010,000. Verified overdue is event-driven: `pages/api/buyers.ts:34-38` sums `payment_milestones` where `status<>'paid' AND due_date<CURRENT_DATE`. The 70% is seed geometry — the seed writes all 7 installments (10/10/10/10/20/20/20) with due dates 2026-01-15→2026-07-15, all past today, so every unpaid 70% slice reads as overdue (`db/seed.ts:273-281`). No "70% formula" exists in code (grep confirmed).
- [ ] **[info] Buyer SSR = Leads SSR (byte-identical, MD5 match)** — `s=buyer` renders the same Sales Leads shell (16,094 B); buyer list/detail (contract, payments, docs) unverifiable from HTML (client-rendered).

## UI Analysis — Sales Brokers (10 Sep 2026)
> Analyzed `/sales?s=brokers&scope=BKP` via session-authenticated render + `/api/brokers` payload.

- [ ] **[info] Brokers = highest-quality live dataset so far (verified)** — 6 real Dubai brokerages (Betterhomes ORN 1470, Allsopp & Allsopp ORN 2058, Haus & Haus ORN 11498, Driven Properties ORN 11917, Metropolitan Premium ORN 11899, Espace Real Estate ORN 1170); KPIs internally exact (deals 9+7+4+3=23; accrued 8.42+6.18+4.02+3.12=21.74M; unpaid 5.26M; alloc_units 86; pending 1). Re-verified live: `/api/brokers` kpis `{agencies:6, pending:1, alloc_units:86, deals:23, accrued:21740000, unpaid:5260000}`; per-agency accrued-paid diffs sum to unpaid (2.32+0+1.62+1.32=5.26M). Data + KPIs self-consistent, no mock markers.
- [ ] **[info] Brokers SSR = Leads SSR (byte-identical, MD5 match)** — `s=brokers` renders the same Sales Leads shell (16,094 B); broker table/KPI strip unverifiable from HTML (client-rendered).

## UI Analysis — Sales Documents (10 Sep 2026)
> Analyzed `/sales?s=documents&scope=BKP` via session-authenticated render + `/api/documents` payload.

- [x] **Seed-signature timestamps on docs + templates (seed artifact, confirmed)** — all docs share second-fragment `…:07:52.93x` across days; all templates share `…:07:52.93x`. Root cause: `db/seed.ts:193-208` inserts with `now()`/`now() - interval` inside one transaction, so all rows carry the same insertion-time millisecond fragment. Generated/seed timestamps, not real events. Not a code bug.
- [x] **`scope=BKP` not reflected in documents — fixed** — docs register returned only H21 docs (all 3 seeded docs are H21 units). Added `?project=` filter to `/api/documents` GET (`pages/api/documents.ts:19-48`): LEFT JOIN units ON unit_no → projects, `p.code = $N` (parameterized). Documents component now receives `scope` from Sales, passes it to the fetch, refetches on scope change (`components/screens/Sales.tsx`). Verified: ALL=3 (all H21), H21=3, BKP=0.
- [ ] **[info] Template library healthy (verified)** — 7 templates, exactly one `live` version per doc type (Invoice v3, SPA v2, Sales Offer v3), archived predecessors present; identical 9-block set.
- [ ] **[info] Documents SSR = Leads SSR (byte-identical, MD5 match)** — `s=documents` renders the same Sales Leads shell (16,094 B); docs table + template cards unverifiable from HTML (client-rendered).

## UI Analysis — Finance Payments (10 Sep 2026)
> Analyzed `/finance?s=payments&scope=BKP` via session-authenticated render + `/api/finance` + `/api/receipts` payloads.

- [x] **Finance sidebar badges mismatch APIs — fixed** — nav badges "Escrow 12"/"Collections 31" were hardcoded, same stale pattern as Leads 34. Shell badge counts now fully dynamic (`components/Shell.tsx`): removed the hardcoded fallback entirely, so badges show ONLY live values and nothing when 0. Counts: `leads` = live leads (>0), `escrow` = unmatched queue + drawdowns (currently 0+4 → shows "4"), `collections` = rows with `days_due>0` (8). Verified live: collections 8 w/ days_due>0, escrow queue 0, drawdowns 4. Badge never reprints stale 12/31.
- [ ] **[info] Payments feed live but seed-repeating (verified)** — 44 receipts; identical per-project batch amounts repeat daily 04→09 Sep (BLG 11.9M / OCH 6.9M / SMW 6.3M / BKP 4.95M / WKP 3.97M, matching WKP recurring 3,966,667); H21 recon batch (RCP-H21-RECON ids 37–44); cheque/PDC workflow present (Mashreq/ENBD/HSBC/ADIB; Presented/Held/Bounced/Cleared). Confirmed: `/api/receipts` returns 44 rows.
- [ ] **[info] Payments SSR minimal** — Finance sidebar group = Payments/Invoices/Escrow/Collections; Payments-screen UI (KPIs, receipts table, PDC import) client-rendered, unverifiable from HTML.
- [x] **Finance sidebar badges confirmed SSR-variant → resolved by badge fix** — the Payments-vs-Invoices SSR nondeterminism ("Escrow 12"/"Collections 31" on one render, none on another) was the OLD hardcoded fallback (`badgeCounts[x] || it.count`) rendering pre-hydration. Removed entirely in the badge fix, so SSR and hydration both render only live counts and nothing at 0.

## UI Analysis — Finance Invoices (10 Sep 2026)
> Analyzed `/finance?s=invoices&scope=BKP` via session-authenticated render + `/api/invoices` payload.

- [x] **Unit prefix mismatch "WPK" vs project "WKP" — fixed (code was the typo)** — the "WPK" unit prefix is the codebase's pervasive convention (46 refs: handover regex `pages/api/handover.ts:67`, snagging/OQD/activity seeds, `Mobile.tsx`, `Settings.tsx` numbering schemes, `AuditLog.tsx`, `Pipeline.tsx`); "WKP" existed exactly once — the project code in `db/seed.ts:17`. Renamed the West Kenn project code `WKP`→`WPK` in `db/seed.ts` and applied to dev DB: `projects.code` (id 5), its 20 units `WKP-###`→`WPK-###`. Zero residual `WKP` refs in units/invoices/collections/documents/escrow_ledger/drawdowns/receipts (verified). Invoice `INV-0041` unit `WPK-T1-0402` now matches project code. `scope=WPK`, `?project=WPK` verified 200 across finance/sales/inventory. Idempotent seed now emits `WPK-001…020`. (One legacy DB seeded before this change must re-run `UPDATE` — applied already; `npx tsx db/reset.ts` also regenerates correctly.)
- [ ] **[info] Invoice data live** — 6 rows (INV-0038…0041), milestone-driven (Structure 20/40%, Substructure, Enabling works), paid/unpaid mix, batch-issued 2026-09-08T18:…; `/api/invoices?scope=BKP` 404 (param not supported); `/api/collections` 404 (comes from `/api/finance`).
- [ ] **[info] Invoices SSR minimal** — Finance shell + client-rendered table; unverifiable from HTML.

## UI Analysis — Finance Escrow (10 Sep 2026)
> Analyzed `/finance?s=escrow&scope=BKP` via session-authenticated render + `/api/finance` escrow payload.

- [ ] **[info] Escrow feed coherent, no new issues (verified)** — 4 drawdowns (DDR-0001 Mobilisation 14.8M → DDR-0004 Structure 40% 62.4M), 3 Released/RERA Approved, 1 Awaiting trustee/RERA Submitted; cert refs "WSP · A. Faruqi". Trustee queue empty (legit state). Escrow SSR = Invoices SSR (20,675 B, MD5 match), sidebar badges absent (matches SSR-variance finding). Data source is `/api/finance` (no dedicated escrow endpoint). Re-verified live (`/api/finance` → `data.escrow`): DDR-0001..0004 amounts 14,800,000 / 21,600,000 / 48,200,000 / 62,400,000; queue 0 — matches. (Note: sidebar Escrow badge correctly shows "4" = queue 0 + drawdowns 4.)

## UI Analysis — Finance Collections (10 Sep 2026)
> Analyzed `/finance?s=collections&scope=BKP` via session-authenticated render + `/api/finance` collections payload.

- [ ] **[info] Collections worklist coherent, no new issues** — 8 rows H21 (Sunil Rathore AED 4.12M/118d Final notice → Priya Nair AED 208K/18d Upcoming); stage ladder escalates with days-due, actions match stages. All H21 — `scope=BKP` not reflected (same pattern as leads/documents, already logged). Collections SSR = Invoices SSR (20,675 B, MD5 match).

## UI Analysis — Handover Pipeline (10 Sep 2026)
> Analyzed `/handover?s=pipeline&scope=BKP` via session-authenticated render + `/api/handover?project=BKP` payload. `/api/pipeline`, `/api/snagging`, `/api/deeds` are 404 — one envelope `/api/handover` serves pipeline+snagging+deeds+readiness+overview.

- [ ] **`WPK` unit-prefix vs `WKP` project-code mismatch is SYSTEMIC** — entire handover dataset (10 pipeline + 8 snags + 6 deeds, all `WPK-T1-*`) uses `WPK` while project code/name is `WKP` (West Kenn). Extends the single-invoice finding to the whole module. Needs one upstream decision: rename project code or unit prefix (unit_no drives joins in many screens).
- [ ] **`?project=BKP` ignored by handover** — returns only WPK/West Kenn rows (same scope-filter pattern as inventory/leads/docs/finance — consolidate into one shared issue if confirmed).
- [ ] **[info] Handover data live & realistic** — 10-stage pipeline (payment → snagging → utilities → deed → keys → OA), 8 snags (ALEC·trade/Siemens/Loxone/Alumco, Critical/Major/Minor, Open/In-progress/Closed/Re-inspect), 6 deeds (OQD-3312…3370, DLD 88.4K–142K, Issued/Applied/Blocked), readiness 12 units → overview **total 12 · ready 8 · blocked 4** (1 payment · 2 snags · 1 docs) — sums exact. `updated_at` all `2026-09-09T00:07:51.738Z` (seed timestamp signature).
- [ ] **[info] Handover SSR minimal** — sidebar = Handover group (Pipeline/Snagging/Title deeds), breadcrumb "Handover pipeline"; pipeline UI client-rendered, unverifiable from HTML.

## UI Analysis — Handover Snagging (10 Sep 2026)
> Analyzed `/handover?s=snagging&scope=BKP` via session-authenticated render + `/api/handover` snagging payload (same envelope, no dedicated endpoint).

- [ ] **[info] Snagging data live & coherent, no new issues** — 8 defects / 6 units (`WPK-T1-*` — see WPK/WKP systemic finding): trades ALEC·Joinery/MEP/Finishes/Civil + Siemens/Loxone/Alumco; severity 2 Critical · 3 Major · 3 Minor; statuses 3 Open · 2 In progress · 2 Closed · 1 Re-inspect; realistic descriptions (e.g. "Low water pressure at basin mixer"). Snagging SSR = Pipeline SSR (14,512 B, MD5 match). 2 Critical snags remain open and correctly drive pipeline "snags open" blockers.

## UI Analysis — Handover Pipeline (10 Sep 2026)
> Analyzed `/handover?s=pipeline&scope=BKP` via session-authenticated render + `/api/handover` payload.

- [x] **WPK/WKP prefix mismatch is SYSTEMIC — resolved** — the whole handover dataset (10 `pipeline_items`, 8 `snag_items`, 6 `deeds`) used `WPK-*` unit prefixes against a `WKP` project code — the same typo as the invoice. Covered by the project-code rename `WKP`→`WPK` (`db/seed.ts:17` + dev DB migration). Verified zero residual `WKP-` rows in pipeline_items/snag_items/deeds/invoices/collections. Readiness regex `/^WPK/i` now correctly matches the project's units.
- [x] **`?project=BKP` ignored by handover — fixed** — `/api/handover` took no scope. Now filters all five queries (`pipeline_items`, `snag_items`, `deeds`, unpaid `invoices`, `collections`) by parameterized `unit_no ILIKE $1` prefix, and readiness scope follows the selected project (default `WPK`). Screens `Pipeline`/`Snagging`/`Deeds` now accept `scope` and refetch on change with state cleared (`pages/handover.tsx`, `components/screens/*.tsx`). Verified: no filter = 10/8/6 + readiness 12 (8 ready / 1 payment + 2 snags + 1 docs blocked); `?project=WPK` identical; `?project=BKP` = all zero (dataset is WPK-only, correct like BKP docs).
- [ ] **[info] Handover data live & realistic (verified)** — 10-stage pipeline (Payment cleared → OA onboarded), readiness 12 → ready 8 / blocked 4 (breakdown confirms audit's "8 ready / 4 blocked exact"); buttons (schedule/search) client-side after data loads.
- [ ] **[info] Handover SSR minimal** — GroupPage shell + client-rendered pipeline; unverifiable from HTML.

## UI Analysis — Handover Snagging (10 Sep 2026)
> Analyzed `/handover?s=snagging&scope=WPK` via session-authenticated render + `/api/handover?project=WPK` payload.

- [ ] **[info] Snagging data live & coherent, no new issues (verified)** — 8 defects across 5 units; exactly 2 Critical still open/in-progress (`WPK-T1-0114` Low water pressure · In progress, `WPK-T1-0208` Ponding at drain outlet · Open); 3 Major (1 open, 2 in progress), 3 Minor (2 Closed, 1 Re-inspect). These 2 Critical rows are precisely the ones `pages/api/handover.ts` counts (`sev=Critical` + Open/In progress) → readiness `blocked_snags=2`, confirming snags correctly drive pipeline blockers.

## UI Analysis — Handover Title Deeds (10 Sep 2026)
> Analyzed `/handover?s=deeds&scope=BKP` via session-authenticated render + `/api/handover` deeds payload (same envelope).

- [ ] **[info] Deeds data live & cross-module consistent, no new issues** — 6 rows (OQD-3312…3370, DLD 88.4K–142K): Issued 4 (keys Released, OA 3 Registered/1 Pending) · Applied 1 (`WPK-T1-0607` Omar Al Suwaidi · keys Held · OA Pending — matches pipeline `documents_ready` "Title deed applied") · Blocked 1 (`WPK-T1-0210` Vikram Shetty · keys Held — matches readiness `Documents missing`). Statuses sum exactly (Issued 4/Applied 1/Blocked 1; Keys 4+2; OA 3+3). Deeds SSR = Pipeline SSR (MD5 match). Uses `WPK` prefix (post-rename consistent) — scope `BKP` returns empty for WPK-only dataset (expected, matches BKP docs).

## UI Analysis — Handover Title Deeds (10 Sep 2026)
> Analyzed `/handover?s=deeds&scope=WPK` via session-authenticated render + `/api/handover?project=WPK` payload.

- [ ] **[info] Deeds data live & cross-module consistent (verified)** — 6 deed rows: 4 Issued/Released, 1 Applied/Held (WPK-T1-0607 Omar Al Suwaidi), 1 Blocked/Held (WPK-T1-0210 Vikram Shetty). Exactly that sole Blocked deed maps 1:1 to `readiness.docs_ok=false` ("Documents missing / Title deed blocked") and `overview.blocked_docs=1` — deeds, pipeline readiness, and overview all agree. WPK/WKP rename + handover scope filter confirmed by operator; this section supersedes the stale "notes" in earlier handover/audit lines.

## UI Analysis — System Users & Roles (10 Sep 2026)
> Analyzed `/system?s=users&scope=BKP` via session-authenticated render + `/api/admins` payload. (Note: `/api/users` is 404 — the live endpoint is `/api/admins`.)

- [ ] **Users table empty-state contradicting populated API** — SSR renders "0 users loaded" + "No users loaded yet - invite one or wait for the user list." while `/api/admins` returns 200 with 2 users (Super Admin `admin@gmail.com`, Test Agent `test-agent@ellington.com`, both super_admin). Live data exists but is not rendered — first screen where SSR explicitly shows the empty state despite data. Re-verify in-browser (possible client-state/race bug in the users table).
- [ ] **[info] System page is first fully-SSR'd screen** — role editor · CEO, 7 role pills, permission matrix (6 modules × CRE/REA/UPD/DEL/APR/EXP), field-level overrides (Discount >3% → Director approval · Locked, Unit price edit → CEO only · Locked, Record payment → Self or above, Issue notice → Legal counsel), approval thresholds (Discount ≤3% Auto · 3–7% · >7% · Payment > AED 500k). 29,412 B SSR vs ~14.5 KB shells elsewhere.

## UI Analysis — System Users & Roles (10 Sep 2026)
> Analyzed `/system/users` via session-authenticated render + `/api/admins` payload.

- [x] **Users table empty-state contradicting populated API — fixed** — `/api/admins` returns 2 admins (`{ok,data:{users:[Super Admin admin@gmail.com super_admin, Test Agent super_admin]}}`, verified live), but the SSR snapshot had already printed "No users loaded yet…". Root cause: `money.$` — the screen starts `dbUsers=null` + `USERS=[]`, so the empty-state rendered during SSR/in-flight before the client fetch resolved (`components/screens/Users.tsx`). Fix: gated the empty-state on a `loaded` flag — shows "Loading users…" while the API is pending and "No users loaded yet…" only after a resolved fetch that legitimately returned zero rows. Post-hydration the 2 admins render (both `super_admin` → "CEO").
- [ ] **[info] System page is first fully-SSR'd screen (verified)** — role editor, permission matrix (6 modules × 6 perms), field-level overrides, and approval thresholds all render in the SSR HTML (29.4 KB); unlike sales/finance/handover screens, virtually all of `/system` is server-rendered and reviewable without hydration. Only the users table body is client-fetched.

## UI Analysis — System Settings (10 Sep 2026)
> Analyzed `/system?s=settings&scope=BKP` via session-authenticated render + `/api/system` payload.

- [ ] **`?s=settings` SSR renders the wrong tab** — SSR (29.4 KB, unchanged bytes vs `?s=users`) still shows breadcrumb + content "Users & roles" (Users table + role editor); the Settings UI (company/branding/numbering/notifications/audit) is never server-rendered. Tab detection appears client-side; only the users-table empty-state line differed between the two URL fetches ("Loading users." on settings fetch vs "No users loaded yet…" on users fetch — the pre-fix state, now resolved see above).
- [ ] **`next` numbering seeds vs observed sequences inconsistent** — settings.numbering: Unit next=403 (auto/tower), Booking next=892, Receipt next=4713 (prefix defined `RCP-{project}-{seq}`, e.g. RCP-H21-004712), Invoice next=3319, Cheque next=884103, Drawdown next=5, Escrow next=9015, Notice pattern `NTC-30D-WPK-T1-0210`, Quote next=143. Observed docs conflict: receipts created today in audit are flat `RCP-000060` (no `{project}` segment, and 60 ≪ 4713); units observed up to WPK-T1-0902 vs next=403; escrow observed ESC-2026-9014 ok, drawdown DDR-0004 ok. Numbering seeds look stale/independent of the actually-generated document set — worth a single reconciliation pass.
- [ ] **Audit log mixes live + seeded actors** — `/api/system` audit: live rows are real Super Admin actions today (imports, PDC clears/bounce, collections contact logging, Structure 40% certification, receipts RCP-0000xx) with real timestamps; seeded rows (Aug 28–Sep 03) use fictional actors Khalid Al Fahim/CEO, Sarah Mitchell/Sales Dir, Ravi Kumar/Finance Mgr, Omar Saeed/Project Mgr and the `.738Z` seed-timestamp signature. Not a bug — flag for realism (fake actors sit alongside real ones in the audit timeline).
- [ ] **[info] Settings payload live & coherent** — company (ORN 21281, RERA 1884, VAT 100234567800003, Ellington Properties Development LLC, DLD 330-00524), brand (AED, Asia/Dubai, DD MMM YYYY, **primary color #4F46F5 = `AC` token**), notif matrix (8 events × email/inapp/slack). Sub-sections fx/vat/banks/templates/retention/pii/integrations empty (unpopulated, not bugs).

## UI Analysis — System Settings (10 Sep 2026)
> Analyzed `/system?s=settings` via session-authenticated render + `/api/system` payload.

- [x] **`?s=settings` SSR renders the wrong tab — fixed** — root cause was Next.js **Automatic Static Optimization**: every group page had no `getServerSideProps`, so `/system` was prerendered at build time with an empty query → default `s="users"`, and that SAME HTML was served for `/system?s=settings`/`?s=audit` (all 29,358 B, indentical). This was also the root cause of the whole family of "SSR = default shell / SSR minimal / unverifiable from HTML" caveats across sales/finance/handover. Fix: added `export const getServerSideProps = () => ({props:{}})` to the 6 multi-screen group pages (`dashboard`, `project`, `sales`, `finance`, `handover`, `system`) → per-request SSR now honors `?s=`/`?scope=`. Verified: `/system?s=users` 29.3 KB (users), `?s=settings` 18.2 KB (Organization settings), `?s=audit` 14.4 KB; `/finance?s=invoices&scope=WPK` and `/sales?s=documents&scope=WPK` SSR contain their screens. Client behavior unchanged.
- [ ] **[info] next-numbering seeds vs observed sequences inconsistent (verified)** — `app_settings.numbering` (seeded `db/schema.sql:535`): Unit `{project}-T{tower}-{seq}` next 403 vs observed tower seq up to 0902 (`H21-T1-0902`, `WPK-T1-0512`); Receipt `RCP-{project}-{seq}` next 4713 vs observed FLAT `RCP-###` (plus recon batch `RCP-H21-RECON`); Invoice `INV-{project}-{seq}` next 3319 vs observed flat `INV-0036…0041`. Consistent: Drawdown `DDR-0004` next 5 (matches DDR-0001..0004); Notice `NTC-{type}-{unit}` next 1. Static metadata, not a runtime counter API.
- [ ] **[info] Audit log mixes live + seeded actors (verified)** — 55 entries; live actor "Super Admin" (real app actions with millisecond timestamps) interleaved with SEEDED fictional execs `Khalid Al Fahim` (CEO), `Sarah Mitchell` (Sales Dir), `Ravi Kumar` (Finance Mgr), `Omar Saeed` (Project Mgr) from `db/schema.sql:516-530` using `now() - interval` in one transaction (shared ms signature family .738Z). Same seed-artifact class as docs/timestamps.
- [ ] **[info] Settings payload live & coherent (verified)** — `/api/system` returns full section set (company, brand, numbering, notif, fx, vat, banks, templates, retention, pii, integrations); brand `Primary color: #4F46F5` == `AC` token exactly.

## UI Analysis — System Audit Log (10 Sep 2026)
> Analyzed `/system?s=audit&scope=BKP` via session-authenticated render + `/api/system` audit payload. (Post-`getServerSideProps` fix the audit tab is SSR'd separately; this snapshot pre-dates that fix so SSR = users tab — see the resolved ASO finding.)

- [ ] **[info] Audit log is the richest cross-module trace, no new issues (verified)** — `/api/system` audit ~55 entries in exactly two coherent populations: (1) live "Super Admin" rows today (Structure 40% `certified`, bank-statement imports, PDC `AUDT-CHQ-1` Held→Bounced, receipts RCP-000047…060, collections Sunil Rathore promise-to-pay/call/reminder) with real millisecond timestamps; (2) seeded execs Khalid/Sarah/Ravi/Omar (`*.738Z` one-transaction signature, `db/schema.sql:516-530`, already flagged). Every row carries actor/role/action/object/field before→after and a sensitive flag (price-list psf change, finance CSV export, user suspend are sensitive=true — correctly flagged). Cross-refs every module audited so far (receipts, escrow recon, milestone certs, discount approvals, booking/snag/lead creation). No inconsistency with today's session activity.
- [ ] **[info] Audit tab SSR = Users tab SSR pre-fix** — `?s=audit` SSR byte-identical to `?s=settings` (29,367 B, MD5 match), both printing the Users & roles tab (29,358 B vs users fetch 29,412 B — byte drift only in the users empty-state line, the Automatic Static Optimization signature). Superseded by the getServerSideProps fix on the 6 group pages (verified above).

## UI Analysis — System Audit Log (10 Sep 2026)
> Analyzed `/system?s=audit` via session-authenticated render + `/api/system` audit payload.

- [ ] **[info] Audit log richest cross-module trace, no new issues (verified)** — 55 entries across 13 object families (Collections 19, Receipt RCP- 8, PDC 8, Construction 4, Bank statements 4, BLG III 5, WPK 2, H21/DDR/Finance/System/Escrow 1 each); live actor "Super Admin" (43 rows) interleaved with 12 seeded fictional-exec rows (Khalid Al Fahim / Sarah Mitchell / Ravi Kumar / Omar Saeed, `db/schema.sql:516-530`). Exactly 3 `sensitive=true` rows — all correct classes: BLG III Price/psf change, Finance Statement export (47 rows CSV), System User status Suspend; live Collections/Construction edits correctly unflagged. Sorting/nulls/CSV export paths intact.
- [x] **Audit tab SSR = users tab SSR pre-fix — superseded** — the byte-identical SSR family (audit 29,358 B == users == settings pre-fix) was the Automatic Static Optimization prerender; resolved by the `getServerSideProps` fix on the 6 group pages. `/system?s=audit` now SSRs its own tab (14.4 KB).

## UI Analysis — Mobile Executive App (10 Sep 2026)
> Analyzed `/mobile?s=mobile&scope=BKP` via session-authenticated render + `/api/mobile` payload (iPhone 15 Pro 393×852 preview frame, "read + approve only").

- [x] **Test projects dominate the Executive-app portfolio value — HIGH — fixed** — `/api/mobile` was the ONLY endpoint missing the repo-wide `WHERE lower(name) NOT LIKE '%test%'` filter (dashboard:42, inventory:50, projects:20 all have it). Test `T` (gdv 2,121M) + `TSE` (gdv 234M) = AED 2,355M of fake GDV inflated portfolio.value to 2,641.6M (**89.2% junk**; real 6 = 286.6M). Added the filter to the mobile projects query (`pages/api/mobile.ts`). Verified live: portfolio.value **286,600,000**, target 257,940,000, collected 204,322,000; T/TSE absent from `projects`.
- [x] **Phone-frame Home mock is STATIC seed, not bound to `/api/mobile` — fixed** — the portfolio/collected/overdue/confidence values were already bound to `agg`, but greeting + date were hardcoded persona/seed: "Good morning, Khalid · Thursday, 3 September"; and every numeric fallback was stale seed (`1320.0M` = exactly half the old live 2,641.6M; `84.2M/7 cheques` vs live 204.3M/6). Now bound live (`components/screens/Mobile.tsx`): greeting = first name from `agg.me.name` (session Super Admin), date = real today via `new Date()` in the original "Weekday, DD Month" format; fallback numbers zeroed/`—` until fetch resolves (same honest all-zero pre-hydration convention as dashboard), so no static half-scale seed ever renders.
- [x] **Approvals badge mismatch — fixed** — phone-nav "Approvals 2" was a hardcoded `badge: 2` in `TABS` (same class as the Finance Escrow/Collections badge bug). Now dynamic: `apprBadge = agg.approvals.count` (live **1**, valueM 62.4 = DDR-0004). Applied to both the phone-frame tab bar (badge hidden at 0) and the All-screens list, plus the More-tab row now shows the live count instead of "2 pending" (`components/screens/Mobile.tsx`, `pages/api/mobile.ts` unchanged).
- [x] **H21 project unit counts inconsistent (mobile payload) — fixed** — `total:8` came from the stale denormalized `projects.units_total` column (8 flagship T1 units seeded; dev DB has 8 T1 + 4 T2 release units = 12); `sold:0` was the stale `projects.sold` (AED) column. Mobile now computes both LIVE from the units join (`total` = `COUNT(u.id)`, `sold` = `SUM(price)` over `sold`/`booked` — same soldV philosophy as `pages/api/dashboard`): H21 now **total=12 = mix sum, sold=12,272,600 = 8 sold units' price, counts.sold=8** — all agree. No DB/tampering; fixes prod + any future drift. (Note: `projects.units_total`/`sold` feed other denormalized-column consumers in the desktop app — reconciling H21's row there is a separate, non-mobile item.)
- [ ] **[info] Live mobile data otherwise coherent (verified)** — ageing buckets (0/208K/1,052K/864K/10,130K) sum EXACTLY to overdue 12,254,000 (re-verified post-fix); 90+ bucket 83% matches buyer Sunil Rathore H21-T1-2705 AED 4.12M/118d; approvals 62.4M = Structure 40% DDR-0004 drawdown. Per-project counts/sold/mix now self-consistent across all 6 real projects (test T/TSE excluded) — BKP total 22 = mix, soldV 38.0M = 13 sold/booked units' price; BLG 28/17/75.4M; OCH 30/18/51.2M; SMW 26/16/41.0M; WPK 20/12/34.9M.

## Rules reminder (AGENTS.md)
- Inline styles only; design tokens from `lib/format.ts`; no Tailwind/shadcn/deps without approval.
- Parameterized SQL only (`$1`…); server-side `withSession` + `withPerm` on every API route.
- `npm run lint` (tsc) + `npm run build` green before push. Never push to main.