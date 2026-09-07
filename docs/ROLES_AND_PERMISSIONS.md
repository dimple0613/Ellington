# ROLES_AND_PERMISSIONS.md

Server-side RBAC is **implemented** (2026-09-07). Enforcement is server-side; the client only hides inaccessible navigation.

## Roles
| Role | Scope | Notes |
|---|---|---|
| `super_admin` | all modules, all actions | full CRE/REA/UPD/DEL/APR/EXP on every module |
| `ops` | day-to-day operations | Inventory + Sales + Handover view/work; **no Finance, no Settings** |
| `finance` | money | Finance full, read-only elsewhere; **no Settings** |
| `viewer` | read-only | reads all modules, export; **no Settings** |

## Modules & actions
6 modules × 6 actions (`CRE` create, `REA` read, `UPD` update, `DEL` delete, `APR` approve, `EXP` export):

`Dashboard`, `Inventory`, `Sales`, `Finance`, `Handover`, `Settings`

## Source of truth
- **DB:** `role_permissions` table (`role` PK, `perms JSONB`) seeded in `db/schema.sql`. `super_admin` is resolved as all-true directly (cannot be locked out by a bad edit).
- **Edge middleware** (`middleware.ts`): dependency-free static matrix `lib/permission-map.ts` for page-level gating — a role without `REA` on a module is redirected to `/403` before the page loads.
- **API routes** (`lib/permissions.ts` + `withPerm`): authoritative DB-backed check on each route; 403 with `"You don't have permission..."` when lacking the module/action.

## Enforcement points
- Page routes: `middleware.ts` maps route prefix → module → `REA`; missing → 307 `/403`.
- APIs: `withPerm(module, action)` wraps `withSession`.
- Shell: `components/Shell.tsx` filters the rail/nav by `roleHasPerm(role, module, "REA")` (client polish only).
- `/profile` + `/api/auth/*` (login/logout/me/profile): auth-only, not module-gated (self-scoped).

## Route → module map (page-level)
| Prefix | Module |
|---|---|
| `/dashboard` | Dashboard |
| `/project`, `/inventory` | Inventory |
| `/sales` | Sales |
| `/finance` | Finance |
| `/handover` | Handover |
| `/system` | Settings |
| `/mobile` | Dashboard |

Current real APIs gated: `/api/dashboard` (Dashboard·REA), `/api/inventory` (Inventory·REA). Role changes take effect on next login (session carries role).
