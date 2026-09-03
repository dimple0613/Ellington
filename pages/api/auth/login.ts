import type { NextApiRequest, NextApiResponse } from "next";
import { verifyPassword } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { serializeCookie, sign } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const r = await query<{ id: number; email: string; password_hash: string; role: string }>(
      "SELECT id, email, password_hash, role FROM admins WHERE email = lower($1) LIMIT 1",
      [email]
    );
    if (r.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const admin = r.rows[0];
    if (!(await verifyPassword(password, admin.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await sign({
      userId: admin.id,
      email: admin.email,
      role: admin.role || "super_admin",
    });

    res.setHeader(
      "Set-Cookie",
      serializeCookie("session", token, {
        path: "/",
        httpOnly: true,
        maxAge: 86400,
        sameSite: "lax",
      })
    );
    return res.status(200).json({ ok: true });
  } catch (e: any) {
    console.error("LOGIN_ERROR", e);
    return res.status(500).json({ error: "debug: " + (e?.message || String(e)) });
  }
}
