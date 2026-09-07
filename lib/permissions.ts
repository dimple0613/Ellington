import { query } from "./db";
import type { Session } from "./session";

export type Action = "CRE" | "REA" | "UPD" | "DEL" | "APR" | "EXP";
export type Module =
  | "Dashboard"
  | "Inventory"
  | "Sales"
  | "Finance"
  | "Handover"
  | "Settings";

export const MODULES: Module[] = [
  "Dashboard",
  "Inventory",
  "Sales",
  "Finance",
  "Handover",
  "Settings",
];

export const ACTIONS: Action[] = ["CRE", "REA", "UPD", "DEL", "APR", "EXP"];

type PermRow = Partial<Record<Module, Partial<Record<Action, boolean>>>>;

/**
 * Fetch the permission map for a role. Never trusts the session payload alone;
 * always reads the source of truth from the DB.
 */
export async function getRolePerms(role: string): Promise<PermRow> {
  if (!role || role === "super_admin") return allTrue();
  const r = await query<{ perms: PermRow }>(
    "SELECT perms FROM role_permissions WHERE role = $1 LIMIT 1",
    [role]
  );
  if (r.rows.length === 0) return {};
  return r.rows[0].perms || {};
}

function allTrue(): PermRow {
  const out: PermRow = {};
  for (const m of MODULES) {
    out[m] = {};
    for (const a of ACTIONS) out[m]![a] = true;
  }
  return out;
}

/**
 * Does the session's role hold <action> on <module>?
 * super_admin always returns true (source of truth via getRolePerms).
 */
export async function hasPerm(
  session: Session,
  module: Module,
  action: Action
): Promise<boolean> {
  if (!session || !session.role) return false;
  const perms = await getRolePerms(session.role);
  return !!(perms[module]?.[action]);
}

export const AUTH_ONLY_MODULES: Record<string, Module> = {};

import type { NextApiRequest, NextApiResponse } from "next";
import { withSession } from "./session";

/**
 * Combine session auth with a module/action permission check.
 * Returns 403 when the authenticated user lacks the permission.
 */
export function withPerm(
  module: Module,
  action: Action,
  handler: (req: NextApiRequest, res: NextApiResponse, session: Session) => void | Promise<void>
) {
  return withSession(async (req, res, session) => {
    const allowed = await hasPerm(session, module, action);
    if (!allowed) {
      return res.status(403).json({ error: "You don't have permission to perform this action." });
    }
    await handler(req, res, session);
  });
}
