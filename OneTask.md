# OneTask.md — CEO Task Tracker

> Live tracker. Updated by the CEO. An approved/completed task is marked here and
> reflected in the status digest. Legend: [ ] todo | [~] in progress | [x] done | [!] blocked

## Push (current branch + what to push)
> Branch-per-task rule (see AGENTS.md): never push directly to main. Update this section per task.

- Current branch: `main` (clean)
- Last task: `chore/branch-per-task-workflow` — AGENTS.md + OneTask.md workflow changes **merged to main** (`bbf1257`)
- Pending code to push: none
- Push command: `git add <files>; git commit -m "<msg>"; git push origin <branch>`

## Today's Focus
- [x] Task 1 — Scaffold project (complete md set)
- [x] Task 2 — Set up GitHub issue/project management (repo + 8 issues created)
- [x] Reference replication — Dashboard (Portfolio) built in reference order
- [x] Projects grid screen built (`/dashboard?s=projects`); dashboard value-position units bug fixed
- [x] Dashboard functionality pass — all buttons/actions wired & verified in browser (KPI → payments/collections/inventory pages, moneyBar + project rows → `/project?s=inventory&scope=<code>`, ageing → Finance·Collections, attention → Finance/Sales pages, Export PDF → `window.print()`, period + fc tabs live); scope now persists via URL `?scope=`
- [x] Finance·Payments screen built (`/finance?s=payments`) — KPIs, Receipts tab (10 rows, Matched/Unmatched pills, escrow refs), Post-dated cheques tab (6 rows, Held/Presented/Cleared/Bounced pills), tab switching live; verified in browser
- [x] Projects "+ New project" now functional (modal with name/location/units/GDV, creates card with auto code + red flag, updates header totals); Sort: sell-through / GDV toggle live; modal closes on outside click / Escape; verified on `/dashboard?s=projects&scope=WPK`
- [x] Financials screen built (`/dashboard?s=financials&scope=WPK`) — 6 KPI tiles, Position by project entity table (computed from PROJECTS), Revenue by quarter bars, Commission payable table; Accounting export (CSV) + Board pack PDF (jsPDF) both work; verified in browser
- [x] Cashflow screen built (`/dashboard?s=cashflow&scope=WPK`) — Expected collections bars + Confidence-adjusted/At-risk summary, 7d/30d/90d/180 days tabs (live recompute), Balance ladder next 30 days, By trigger type (46/41/13% split), Sep 26–Feb 27 monthly drawdown table; verified full render ×3 (0 console errors) + all 4 tab switches
- [x] Reports screen built (`/dashboard?s=reports`) — 27 report cards in 4 groups (Sales/Finance/Compliance/Project) each with a working Run (CSV) button, Scheduled deliveries table, Custom report builder modal (report+format selector → CSV/XLSX/PDF download) + Assemble board pack (PDF); all 49 content strings verified, all 3 header actions functional
- [x] Inventory + Unit screens built (`/project?s=inventory&scope=<code>` and `/project?s=unit&unit=<id>`) — Inventory with all 4 views (Stack plan/Floor plate/List/Cards), status filter bar (live counts+values, dims non-matching), Price/sq.ft heat toggle, Export price list (CSV); Unit screen (header + metrics/bar, Overview/Payments/Documents/Activity tabs, price-derivation ladder, instalment schedule, docs vault, activity timeline, compliance). Clicking any unit routes to the unit screen. Verified in browser: filter dims 120/84 correctly, tabs switch, unit nav works, 0 console errors
- [x] Sales group built (`/sales?s=leads|booking|buyer|brokers|documents`) — `components/screens/Sales.tsx`: Leads kanban (8 columns, funnel, New booking → booking), Booking wizard (5 steps, deal summary, approval banner, escrow ref), Buyer 360 (header, 4 tiles + Next due, Units/Ledger/Schedule tabs, payment behaviour + relationship sidebar, Open unit record → /project?unit), Brokers (Agencies/Agents/Onboard agency/Activity tabs + 5 KPIs), Documents (13 doc types, Generate preview PDF page + Template studio with merge fields + version control). Build green, 0 console errors, all screens + interactions browser-verified
- [x] Unit header action buttons made functional: **Generate SOA** → `exportUnitSoa` PDF (`soa-<unit>.pdf`), **Generate EOI** → `exportUnitEoi` PDF (`eoi-<unit>.pdf`), **Record payment** → `/finance?s=payments`. Verified in browser: both downloads fire + nav works, 0 console errors
- [x] Pricing & availability screen built (`/project?s=pricing`) — `components/screens/Pricing.tsx`: Price ladder (5 typologies × 5 floor-bands heat matrix, 25 cells), Bulx/revision form (interactive Selection + Change dropdowns, preview rows, GDV impact, Submit for approval → pending), Release phases (4 rows + Phase 2 countdown banner), Discount governance (policy + 12-month leakage bars), Export price list CSV, Version history toggle. Build green, 0 console errors, CDP-verified
- [x] Construction progress screen built (`/project?s=construction`) — `components/screens/Construction.tsx`: dark Overall completion card (46.0%, planned marker, team, handover forecast), Work packages table (8 rows with actual/planned bars + variance), Milestones & money table (6 rows), Site photo feed (5), Risk register (3); **Certify milestone** → Structure 40% → Certified + amount invoiced toast, **Upload photo set** → prepends new photo + toast. Build green, 0 console errors, CDP-verified
- [x] Leads → New booking made fully dynamic (`components/screens/Sales.tsx`): lead kanban cards now clickable (New booking affordance per card) → opens the 5-step booking wizard **pre-filled with that lead's buyer name + unit suggestion**; top "New booking" button opens a blank booking. Booking form fields are now **editable inputs** (buyer name, mobile, discount %, amount) with live-recalculating net price + booking amount + deal summary; Confirm booking shows a confirmation banner naming the created-from lead. CDP-verified both entry paths, 0 console errors
- [x] Buyer 360 "Send statement" + "Record payment" made dynamic (`components/screens/Sales.tsx` + `Payments.tsx` + `lib/pdf.ts` + `pages/finance.tsx`): **Send statement** → generates a real buyer Statement PDF (`statement-rajesh-menon.pdf`, via new `exportBuyerStatement` in `lib/pdf.ts`: position summary, units table, transaction ledger from the buyer's live ledger) + "Statement emailed/logged" banner; **Record payment** → navigates to `/finance?s=payments&buyer=Rajesh+Menon`, shows a "Recording payment for <buyer>" context banner, opens the Record payment form (pre-filled buyer), records → prepends new receipt row `RCP-H21-004790` + "Payment recorded" banner. CDP-verified both flows end-to-end, 0 console errors
- [x] Documents screen made fully dynamic (`components/screens/Sales.tsx` + `lib/pdf.ts`): new `exportDocument` in `lib/pdf.ts` generates a real PDF for any doc type (unit spec table, payment plan, buyer/project metadata). **Generate tab**: Unit + Buyer dropdowns (from `ALL_UNITS`/`BUYERS` data) update the preview live (unit ref, typology, beds, area, price, psf, payment plan amounts all recalculate); media toggles are clickable (state-driven); **Generate and send** → downloads PDF (`i-h21-004412.pdf` for Invoice) + "emailed to <buyer>" banner + "Recently generated" log; **Download PDF** → same export; **Template studio** tab → blocks list, merge fields, version control; **Set as active template** → bumps to v4 Live + notice; **Save as draft** → v4 draft saved + notice. CDP-verified: page loads, doc types selectable, unit/buyer dropdowns change preview, Generate and send downloads real PDF + banner + log, 0 console errors
- [x] Collections + Escrow screens built (`components/screens/Collections.tsx` + `Escrow.tsx`, wired into `pages/finance.tsx`). **Collections**: 6 aging buckets (Current/1-30/31-60/61-90/90+/Legal) with live selection highlight + red on danger buckets; collection worklist table (8 rows: buyer, unit, AED amount, overdue days, stage pill, action) with **Remind** (queued + banner), **Log call** (logged + banner), **Escalate** (navigates to escrow) per-row buttons; **Default calculator** sidebar (unit info, verified construction %, 3 retention tiers with active highlight, contract/paid/retention/refund summary, Generate 30-day notice button). **Escrow**: header card (project + bank + last import), 4-column identity row (escrow bank, IBAN monospace, RERA acc no.); 4 KPI tiles (collected/deposited/variance alert in red/balance); 3 gauge cards (upfront/retention/drawn-down with bar + mark + flag note); reconciliation queue (6 rows with date/desc/amount/side pill + **Match to** button that removes row + banner + **Flag** button); standing obligations (7 rows with status dots + flagged amber for expiring permits); drawdown requests table (4 rows: DDR ID/milestone/amount/engineer cert/RERA pill/status pill). **New drawdown request** button in header. CDP-verified both screens: 30/31 checks pass, 0 console errors
- [x] Handover screens built (`components/screens/Pipeline.tsx` + `Snagging.tsx` + `Deeds.tsx`, wired into `pages/handover.tsx`). **Pipeline**: 9-column kanban (Payment cleared \u2192 OA onboarded with unit cards), blocked units list (4 with reason dots), average days in stage bar chart (7 stages, amber for >15d), handovers forecast vertical bars (W1\u2013W8); "Open snag list" navigates to snagging. **Snagging**: 4 KPI tiles (open/critical/re-inspection/closed counts), open by trade horizontal bars (6 trades), snag table (8 rows: unit, location, trade, description, severity pill [Critical/Major/Minor], contractor, status pill [Open/In progress/Closed/Re-inspect], re-inspect date, Photo + Close action buttons); **Close** toggles row to closed + banner, KPIs update live. **Deeds**: title deeds table (6 rows: unit, owner, Oqood ref, DLD 4%, deed status pill [Issued/Applied/Blocked], issued date, keys pill [Released/Held], Mollak pill [Registered/Pending]); sidebar: service charge & warranty card (6 rows), handover completion card (96/140 teal). Build green, 0 console errors, CDP-verified
- [x] System group built (`components/screens/Users.tsx` + `Settings.tsx` + `AuditLog.tsx`, wired into `pages/system.tsx`). **Users & roles**: 7-user table (name/email/role/projects/last active/2FA/status, row-selectable role editor), permission matrix (6 modules \u00d7 6 CRUD/APR/EXP toggles, working), field-level overrides with Locked pills, approval thresholds with Auto pills, working Invite user. **Settings**: 5 tabs (Company identity/brand locale, Numbering conventions with mono prefixes, Notification matrix with toggles, Integrations grid with Connect/Manage, Other placeholder), working Save changes. **Audit log**: append-only info bar, 12-row 8-column table, live search filter, Export CSV. CDP-verified 24/24 checks, 0 console errors
- [x] Mobile executive app built (`components/screens/Mobile.tsx`, wired into `pages/mobile.tsx`). Four interactive iPhone 15 Pro mockups via bottom tab bar \u2014 **Home** (portfolio value, collected/overdue, 30-day confidence bar), **Projects** (sold ring 71%, status legend, financial tiles, typology mix bars), **Money** (collections/forecast/ageing tabs, colour-coded ageing buckets, PII-gated buyer row), **Approvals** (2-badge inbox: discount request + drawdown request with working Approve/Reject), **More** (profile + menu). Live tab switching, per-screen description panel, tap-to-preview All screens list. Build green, 0 console errors, CDP-verified
- [x] **Full-system verification completed (CDP, headless Chrome)** \u2014 `verify_functionality.js` **89/89** and `verify_responsive.js` **70/70** all pass (commit `524ace6`, pushed). Every screen (25) renders with zero console errors; all buttons/menus/modals/interactions exercise live state (notifications panel + dismiss/mark-all-read, profile/help menus, CmdK search, login form submit + redirect, Escrow New drawdown, Users Invite, Snagging Raise snag + Assign contractor, Reports Custom report builder + Run + Assemble board pack). Responsive across mobile/tablet/laptop/desktop with no horizontal overflow on mobile/tablet. `npm run build` green. Any previously flagged test "failures" were test-harness text-marker mismatches, not app bugs \u2014 resolved and re-verified.

## Backlog (pending)
- [ ] Issue #1 — Task 3: CEO-Review baseline (feature spec from Ellington reference)
- [ ] Issue #2 — Task 4: Data model: projects, units, buyers, receipts, milestones, escrow ledger
- [ ] Issue #3 — Task 5: Inventory screen (unit board + status)
- [ ] Issue #4 — Task 6: Sales: leads kanban + booking wizard
- [ ] Issue #5 — Task 7: Finance: payments, collections ageing, escrow recon, cashflow
- [ ] Issue #6 — Task 8: Executive mobile app (read-only)
- [ ] Issue #7 — Task 9: Handover — pipeline, snagging, title deeds
- [ ] Issue #8 — Task 10: Daily status digest (IST 10:00 / 22:00)

## GitHub Issues
- #1 Task 3 / #2 Task 4 / #3 Task 5 / #4 Task 6 / #5 Task 7 / #6 Task 8 / #7 Task 9 / #8 Task 10

## In Progress
- [~] Issue #4 - Sales: leads kanban + booking wizard

## Done
- [x] Task 1 — scaffold (TEAM, OneTask, CEO-Review, README, MILESTONES, ROADMAP, WORKFLOW, AGENTS + docs/)
- [x] Task 2 — Git repo + remote origin + gh installed/auth + project labels + 8 issues on github.com/dimple0613/Ellington
- [x] Task 3 — Issue #1/CEO-Review migrated; issue #2 data model + Next.js/TS scaffold done (commit 4542e8e; build + tsc pass; DB seeded with 5 Ellington projects)
- [x] Task 4 — Issue #3 inventory screen (unit board + status tiles + filters + API) done (build + tsc pass)

## Blocked
- (none)

## CEO Notes
- Reference: Archive/UI systems design review/Ellington ERP.dc.html
- Stack: PostgreSQL + SQL, Next.js, shadcn/ui + Tailwind, Formik + Yup, toast.
## Active Assignment (CEO)
- **Issue #4 — Sales: leads kanban + booking wizard**
- Assignee: Engineering Lead + Frontend Engineer
- Reviewer: CEO (approval before close)
- Reporting: CEO gets status at each milestone