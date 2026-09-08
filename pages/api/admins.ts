import type { NextApiRequest, NextApiResponse } from "next";
import { withSession } from "../../lib/session";
import type { Session } from "../../lib/session";
import { hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { hashPassword } from "../../lib/auth";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ALLOWED_ROLES = new Set([
  "super_admin", "ops", "finance", "viewer",
  "ceo", "sales_director", "sales_manager", "finance_manager",
  "project_manager", "sales_agent", "legal_counsel",
]);
const DEFAULT_PASSWORD = "Admin123";

export default withSession(async function (req: NextApiRequest, res: NextApiResponse, session: Session) {
  if (req.method === "GET") {
    if (!(await hasPerm(session, "Settings", "REA"))) {
      return res.status(403).json({ error: "You don't have permission to perform this action." });
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
    return res.status(200).json({ users: data });
  }

  if (req.method === "POST") {
    if (!(await hasPerm(session, "Settings", "CRE"))) {
      return res.status(403).json({ error: "You don't have permission to perform this action." });
    }
    const { name, email, role, password } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: "name and email are required" });
    const addr = String(email).trim().toLowerCase();
    if (!EMAIL_RE.test(addr)) return res.status(400).json({ error: "A valid email address is required" });
    const r = String(role || "viewer");
    if (!ALLOWED_ROLES.has(r)) return res.status(400).json({ error: "Unsupported role: " + r });
    const pwd = password ? String(password) : DEFAULT_PASSWORD;

    const existing = await query<any>(
      "SELECT id FROM admins WHERE lower(email) = lower($1)",
      [addr]
    );
    if (existing.rows.length) return res.status(409).json({ error: "Email already exists" });

    const hash = await hashPassword(pwd);
    const ins = await query<any>(
      "INSERT INTO admins (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
      [String(name), addr, hash, r]
    );
    return res.status(201).json({ id: ins.rows[0].id });
  }

  return res.status(405).json({ error: "Method not allowed" });
});