import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { hashPassword } from "../../lib/auth";

export default withPerm("Settings", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
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
    const { name, email, role, password } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: "name and email are required" });

    const existing = await query<any>(
      "SELECT id FROM admins WHERE lower(email) = lower($1)",
      [email]
    );
    if (existing.rows.length) return res.status(409).json({ error: "Email already exists" });

    const pwd = password || "Admin123";
    const hash = await hashPassword(pwd);
    const ins = await query<any>(
      "INSERT INTO admins (full_name, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id",
      [name, email, hash, role || "viewer"]
    );
    return res.status(201).json({ id: ins.rows[0].id });
  }

  return res.status(405).json({ error: "Method not allowed" });
});