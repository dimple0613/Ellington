# ROLES_AND_PERMISSIONS.md

## Roles
| Role | Scope | Purpose |
|---|---|---|
| `super_admin` | all projects | everything |
| `ops` | one/many projects | day-to-day: inventory, sales, collections actions |
| `finance` | one/many projects | payments, escrow, cashflow, invoices |
| `viewer` | read-only | reports, dashboards |

## Permission keys (planned catalog)
- `inventory.view` / `inventory.manage`
- `leads.view` / `leads.manage`
- `booking.create`
- `payments.view` / `payments.manage`
- `escrow.manage`
- `collections.manage`
- `reports.export`
- `users.manage` (super_admin only)

## Enforcement
- `requirePermission(req, res, key)` on every API route.
- Sidebar renders only permitted screens.
- Everything is server-side; never gate access on client state alone.