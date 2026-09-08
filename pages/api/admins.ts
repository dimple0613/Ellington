import type { NextApiRequest, NextApiResponse } from "next";
import { withSession } from "../../lib/session";
import type { Session } from "../../lib/session";
import { hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { hashPassword } from "../../lib/auth";
import { ok, fail, methodNotAllowed, validEmail, missingFields } from "../../lib/api";

const ALLOWED_ROLES = new Set([
  "super_admin", "ops", "finance", "viewer",
  "ceo", "sales_director", "sales_manager", "finance_manager",
  "project_manager", "sales_agent", "legal_counsel",
]);
const DEFAULT_PASSWORD = "Admin123";

export default withSession(async function (req: NextApiRequest, res: NextApiResponse, session: Session) {
  if (req.method === "GET") {
    if (!(await hasPerm(session, "Settings", "REA"))) {
      return fail(res, "You don't have permission to perform this action.", 403);
    }
    const admins = await query<any>(
      `SELECT id, full_name, email, role FROM admins ORDER BY id`
    );
    const data = admins.rows.map((a) => ({
      id: a.id,
      name: a.full_name || "",
      email: a.email,
      role: a.role || "viewer",
    }));
    return ok(res, { users: data });
  }

  if (req.method === "POST") {
    if (!(await hasPerm(session, "Settings", "CRE"))) {
      return fail(res, "You don't have permission to perform this action.", 403);
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const { name, email, role, password } = body;
    const miss = missingFields(body, ["name", "email"]);
    if (miss) return fail(res, miss);
    const addr = String(email).trim().toLowerCase();
    if (!validEmail(addr)) return fail(res, "A valid email address is required");
    const r = String(role || "viewer");
    if (!ALLOWED_ROLES.has(r)) return fail(res, "Unsupported role: " + r);
    const pwd = password ? String(password) : DEFAULT_PASSWORD;

    const existing = await query<any>(
      "SELECT id FROM admins WHERE lower(email) = lower($1)",
      [addr]
    );
    if (existing.rows.length) return fail(res, "Email already exists", 409);

    const hash = await hashPassword(pwd);
    const ins = await query<any>(
      "INSERT INTO admins (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
      [String(name), addr, hash, r]
    );
    return ok(res, { id: ins.rows[0].id }, 201);
  }

  return methodNotAllowed(res);
});