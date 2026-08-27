# DATABASE.md — Database Reference

## Overview

- **PostgreSQL** (Laragon) on `localhost:5432`, database `developer_inventory`.
- Access only server-side (in the Next API layer) via a `pg` Pool and parameterized SQL.
- Source of truth for every unit, status, price, buyer, receipt and escrow movement.
- Money & status changes are written to an audit trail.

## Tables

### `projects`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `code` | text UNIQUE | e.g. `BLG`, `OCH` |
| `name` | text | Belgravia Heights III |
| `location` | text | |
| `units_total` | int | |
| `status` | text | launched / under_construction / handover |
| `gdv` | numeric | gross development value (AED) |

### `units`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `project_id` | int FK → projects | |
| `no` | text | e.g. `H21-T1-1204` |
| `type`/`beds` | text / int | 1BR–3BR |
| `area` / `view` | numeric / text | sq.ft, view |
| `status` | text | available / booked / reserved / held / blocked / sold |
| `price` | numeric | |
| `buyer_id` | int FK → buyers NULL | set when sold/booked |

### `buyers`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `name` | text | |
| `email`,`phone` | text | |
| `kyc_status` | text | pending / cleared |

### `leads`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `project_id` | int FK | |
| `name`,`source` | text | Property Finder, Bayut, referral… |
| `stage` | text | new/contacted/qualified/viewing/negotiation/eoi/booked/lost |
| `budget_min` / `budget_max` | numeric | |
| `agent` | text | |
| `stage_changed_at` | timestamptz | |

### `receipts`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `unit_id` | int FK | |
| `buyer_id` | int FK | |
| `amount` | numeric | AED |
| `method` | text | bank transfer / cheque / cash |
| `escrow_ledger_id` | int FK NULL | matched against escrow |
| `matched` | boolean | reconciliation state |

### `payment_milestones`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `unit_id` | int FK | |
| `milestone` | text | booking / spa / 20% / structure… |
| `due_date` | date | |
| `percent` | int | |
| `amount` | numeric | |
| `status` | text | paid / due / scheduled |

### `escrow_ledger`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `project_id` | int FK | |
| `reference` | text | e.g. RCP-H21-004706 |
| `direction` | text | in / out |
| `amount` | numeric | |
| `bank` | boolean | appears on bank statement |
| `system` | boolean | appears in our ledger |
| `matched` | boolean | reconciliation |

### `collection_actions`
| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | |
| `receipt_id` | int FK | |
| `stage` | text | auto_reminder / reminder_1 / reminder_2 / notice / legal |
| `note` | text | promise to pay, call scheduled… |

## Reports (derived from above)
- **Ageing** — receipts grouped by days overdue (current, 1–30, 31–60, 61–90, 90+, legal).
- **Escrow variance** — sum(bank-only) vs sum(system-only); unmatched items surfaced.
- **Cashflow forecast** — scheduled milestone amounts by date vs collected.

## Seeding / migration
- `npm run db:setup` — idempotent schema + demo seed (5 projects mirroring the Ellington reference, unit board, buyers, receipts, milestones, escrow ledger).