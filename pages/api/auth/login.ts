export const runtime = "edge";

import { verifyPassword } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { sign } from "../../../lib/session";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const r = await query(
    "SELECT id, email, password_hash, role FROM admins WHERE email = lower($1) LIMIT 1",
    [email]
  );
  if (r.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
  const admin = r.rows[0];
  if (!(await verifyPassword(password, admin.password_hash)))
    return res.status(401).json({ error: "Invalid credentials" });

  const token = await sign({
    userId: admin.id,
    email: admin.email,
    role: admin.role || "super_admin",
  });
  res.setHeader(
    "Set-Cookie",
    `session=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`
  );
  return res.status(200).json({ ok: true });
}
