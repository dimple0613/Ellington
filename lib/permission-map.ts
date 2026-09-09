// Dependency-free role -> module/action permission matrix.
// Used by edge middleware for page-level gating (must not import Node-only
// modules like pg). API routes enforce the authoritative DB-backed copy via
// lib/permissions.ts, so live permission edits still take effect there.
export type PermAction = "CRE" | "REA" | "UPD" | "DEL" | "APR" | "EXP";
export type PermModule =
  | "Dashboard"
  | "Inventory"
  | "Sales"
  | "Finance"
  | "Handover"
  | "Settings"
  | "Construction";

type PermMap = Record<PermModule, Record<PermAction, boolean>>;
type RoleMap = Record<string, PermMap>;

export const MODULE_LIST: PermModule[] = [
  "Dashboard",
  "Inventory",
  "Sales",
  "Finance",
  "Handover",
  "Settings",
  "Construction",
];

export const ACTION_LIST: PermAction[] = ["CRE", "REA", "UPD", "DEL", "APR", "EXP"];

export const ROLE_PERM_MATRIX: RoleMap = {
  super_admin: {
    Dashboard: { CRE: true, REA: true, UPD: true, DEL: true, APR: true, EXP: true },
    Inventory: { CRE: true, REA: true, UPD: true, DEL: true, APR: true, EXP: true },
    Sales: { CRE: true, REA: true, UPD: true, DEL: true, APR: true, EXP: true },
    Finance: { CRE: true, REA: true, UPD: true, DEL: true, APR: true, EXP: true },
    Handover: { CRE: true, REA: true, UPD: true, DEL: true, APR: true, EXP: true },
    Settings: { CRE: true, REA: true, UPD: true, DEL: true, APR: true, EXP: true },
    Construction: { CRE: true, REA: true, UPD: true, DEL: true, APR: true, EXP: true },
  },
  ops: {
    Dashboard: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Inventory: { CRE: false, REA: true, UPD: true, DEL: false, APR: false, EXP: true },
    Sales: { CRE: true, REA: true, UPD: true, DEL: false, APR: false, EXP: true },
    Finance: { CRE: false, REA: false, UPD: false, DEL: false, APR: false, EXP: false },
    Handover: { CRE: false, REA: true, UPD: true, DEL: false, APR: false, EXP: false },
    Settings: { CRE: false, REA: false, UPD: false, DEL: false, APR: false, EXP: false },
    Construction: { CRE: false, REA: true, UPD: true, DEL: false, APR: false, EXP: false },
  },
  finance: {
    Dashboard: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Inventory: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: false },
    Sales: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Finance: { CRE: true, REA: true, UPD: true, DEL: false, APR: true, EXP: true },
    Handover: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: false },
    Settings: { CRE: false, REA: false, UPD: false, DEL: false, APR: false, EXP: false },
    Construction: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: false },
  },
  viewer: {
    Dashboard: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Inventory: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Sales: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Finance: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Handover: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: true },
    Settings: { CRE: false, REA: false, UPD: false, DEL: false, APR: false, EXP: false },
    Construction: { CRE: false, REA: true, UPD: false, DEL: false, APR: false, EXP: false },
  },
};

export function roleHasPerm(
  role: string | undefined,
  module: PermModule,
  action: PermAction
): boolean {
  if (!role) return false;
  const perms = ROLE_PERM_MATRIX[role];
  if (!perms) return false;
  return !!perms[module]?.[action];
}
