# CEO-Review.md — Project Review

> Review of the Developer Inventory build, referenced to the Ellington ERP design
> (Archive/UI systems design review/Ellington ERP.dc.html).

## Executive Summary
We are building a **developer-sales ERP console**: manage inventory, pricing,
sales/leads/booking, finance/collections, escrow, cashflow and handover from one
place, plus an executive mobile app. The Ellington reference is our UI + feature
blueprint.

## Product Goals
1. Know exactly what is available and at what price, per project and unit.
2. Track the pipeline from lead → qualified → booked → purchaser.
3. See money: sold value, collected, outstanding, overdue, escrow variance, cashflow.
4. Run handover (snagging, title deeds) cleanly.
5. Give leadership an executive mobile snapshot.

## Build Principles
- Postgres as the source of truth; multi-project/tenant scoping.
- Money & status changes are auditable (escrow/ledger integrity).
- One unit-status model shared across inventory, sales, finance, handover.
- shadcn/ui + Tailwind UI, Formik + Yup forms, toast feedback, Next.js.

## Status
- Phase 0: scaffolding + GitHub issue management → in progress.

## Decisions Required (CEO)
- Repo host + access (owner provides).
- SMTP for daily digest (owner provides credentials).
- First build target: Portfolio dashboard vs Inventory vs Finance. Recommend Inventory.

## Success Measures
- Time-to-valued-screen for the operator < 2 clicks.
- Collections overdue visible per buyer with ageing.
- Escrow reconciliation variance surfaced daily.