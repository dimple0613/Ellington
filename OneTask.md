# OneTask.md — CEO Task Tracker

> Live tracker. Updated by the CEO. An approved/completed task is marked here and
> reflected in the status digest. Legend: [ ] todo | [~] in progress | [x] done | [!] blocked

## Push (current branch + what to push)
> Branch-per-task rule (see AGENTS.md): never push directly to main. Update this section per task.

- Current branch: `fix/parity-live-data` (PLINTH parity — verified remaining gaps). Push target: this branch only.
- Pushed so far: **D1** `728b479` (dashboard live KPIs), **D2** `bf3f350` (leads drawer + drag gate).
  Next to push: **D3** once committed.
- Prior `fix/plinth-parity` commits (T1–T18) are historical and NOT to be treated as completion evidence.

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
- [ ] **D3 Inventory context** — `scopeName` hardcoded "Tower 1", CHIPS static (`Inventory.tsx:58-65`),
      no summary strip, no building tabs. Task: derive name/tabs/summary from `/api/inventory`.
- [ ] **D4 Shell live** — mock `NOTIFS` (`components/Shell.tsx:128-135`), hardcoded ticker
      "ORN 21281 · H21 / Due today · AED 4.2M" (`:750`), org name (`:387`). Task: ticker + notifications
      from real data where it exists; mark N/A explicitly otherwise.

### P3 — Finance / Sales stats
- [ ] **D5 Finance KPIs** — Payments `kpis`/`payRows`/`fallbackPdc` hardcoded (`Payments.tsx:112-140`);
      Collections buckets (`Collections.tsx:29-36`). Receipt create/PDC/import are already live.
      Task: compute KPIs from `/api/finance`.
- [ ] **D6 Sales stats** — funnel/conversion/leaderboard fallback arrays (`Sales.tsx:14-17, :35-64`,
      `LB_FALLBACK :58-64`). Task: compute from `leads` + `bookings` tables.

### Deferred / N/A (needs operator approval — NOT started)
- [ ] **Settings extra tabs** (Financial/Templates/Data) — `Settings.tsx:6` has 5 tabs
      (Company/Numbering/Notifications/Integrations/Other). Visual change → AGENTS.md approval required.
- [ ] **`lib/data.ts` mock purge** (`POS :22-29`, `BUYERS :31-44`, `PROJECTS :60-66`, `UNITS :84-122`)
      — remains as fallback while D1–D6 wire live data.

## Working baseline (verified in code, NOT re-litigated)
- Live DB-backed today: receipts (create/PDC/import), invoices (issue/void/bulk), collections, escrow,
  pipeline/snagging/deeds, users/settings (`app_settings` numbering+notif)/audit log, brokers, bookings,
  documents, inventory + unit detail, construction milestones, leads stage PUT.
- Schema tables present: admins, role_permissions, documents, document_templates, escrow_ledger,
  pipeline_items, receipts, bank_statements, collections, drawdowns, invoices, construction_milestones,
  app_settings, leads, buyers, bookings, broker_*, audit_log, snag_items, deeds, password_resets.
- Baseline regression harnesses: `verify_functionality.js` (89) + `verify_responsive.js` (70) — rerun
  before each task is marked done.

## Rules reminder (AGENTS.md)
- Inline styles only; design tokens from `lib/format.ts`; no Tailwind/shadcn/deps without approval.
- Parameterized SQL only (`$1`…); server-side `withSession` + `withPerm` on every API route.
- `npm run lint` (tsc) + `npm run build` green before push. Never push to main.