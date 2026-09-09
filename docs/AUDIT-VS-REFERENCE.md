# Audit vs Reference — confirmed non-working / parity gaps

> Date: 09 Sep 2026 · Branch: `fix/parity-live-data` · Method: dynamic browser audit
> (`audit_dynamic.js`, Chrome CDP :9229, 62 pass/12 fail then code+DB verification of each fail)
> against `C:\Users\admin\Downloads\New folder\plinth-prompt-pack_1.html`.
> Baseline harnesses remain green: responsive 70/70, functionality 86/89 (3 stale markers).

## BUG — Payments Collected today / MTD always AED 0 even when receipts exist today — FIXED `6179180`

- **Evidence:** `receipts` rows id 43/44 exist dated `09 Sept 26` (today, `MAX(received_at)=2026-09-09T00:07:52Z`),
  yet the Payments screen showed `COLLECTED TODAY · AED 0 · 0 receipts issued` and `COLLECTED MTD · AED 0`.
- **Root cause:** `pages/api/receipts.ts:37,42` formatted dates with `toLocaleDateString("en-GB",...)`,
  which emits a **4-letter** abbreviation for September (`"Sept"`).
  `components/screens/Payments.tsx:126` parses with `/^(\d{1,2}) ([A-Za-z]{3}) (\d{2})$/` —
  3-letter months only. `"09 Sept 26"` fails the regex → `parseD` returns `null` → today/MTD = 0.
  PDC/unreconciled/bounced KPIs don't use the date, so they showed correct non-zero values.
- **Fix (committed `6179180`):** added `fmtShortDate` (3-letter month, `DD Mon YY`) to `lib/format.ts`
  and used it in `pages/api/receipts.ts` (receipt `date`, `cheque_date`) and
  `pages/api/receipts/import.ts` (statement `date`). This also matches the reference `24 Aug 26` style.
- **Verified:** after fix the screen shows `COLLECTED TODAY · AED 38.02M · 13 receipts issued` and
  `COLLECTED MTD · AED 208.40M · 39 receipts · live` (was AED 0). Lint + build green.

## Gap 1 — Settings missing Financial / Templates / Data tabs

- `components/screens/Settings.tsx:6` has only 5 tabs (Company / Numbering / Notifications / Integrations /
  Other). Reference specifies separate **Financial**, **Templates**, and **Data** tabs
  (Data = retention, export schedules, IP allow-list, SSO — currently folded into Other).
- Status: previously deferred (`OneTask.md`), needs operator approval (visual/tab change). Add tab bodies.

## Gap 2 — Audit Log lacks expandable diff + date/actor filters

- `components/screens/AuditLog.tsx` renders live rows from `/api/system` (`audit_log` table, 12 rows,
  fields `ts/actor/role/action/object/field/before_val/after_val/sensitive`) with search +
  high-sensitivity toggle + Export CSV.
- Reference wants: **expandable rows showing before→after field diff** and **date-range + actor filters**.
  Column data is already present (`before_val`/`after_val`) — expansion is UI-only.

## Verified NOT issues (audit fails were label/timing mismatches)

- **Invoices** — no standalone "New invoice" needed; header has "Bulk issue for window" + "Generate
  statement", per-row Issue/Void present (`Invoices.tsx:184-187`), rows render live (6 rows).
- **Escrow** — "Match" works via per-row "Match to…" (direct API action, no modal); "New drawdown" opens.
- **Collections** — "Promise to pay" exists as "Promise" (opens log modal); calculator panel + "Calculate".
- **Pipeline** — "Advance" is card-select + schedule; "Schedule handover" button present.
- **Inventory** — all 4 view modes present (Stack plan / Floor plate / List / Cards, `Inventory.tsx:49-56`).
- **Reports** — "Scheduled deliveries" section present (`Reports.tsx:143`).
- **payments/leads/buyer render** — timing flakes only; render fully at 4s (live KPIs + funnel + buyer count).
- **Payments today/MTD zeros** — see BUG above (root cause found, not a data artifact).