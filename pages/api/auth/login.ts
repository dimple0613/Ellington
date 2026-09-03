export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { sign } from "../../../lib/session";

export default async function handler(req: NextRequest) {
  if (req.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const r = await query(
    "SELECT id, email, password_hash, role FROM admins WHERE email = lower($1) LIMIT 1",
    [email]
  );
  if (r.rows.length === 0) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  const admin = r.rows[0];
  if (!(await verifyPassword(password, admin.password_hash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await sign({
    userId: admin.id,
    email: admin.email,
    role: admin.role || "super_admin",
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", token, {
    path: "/",
    httpOnly: true,
    maxAge: 86400,
    sameSite: "lax",
  });
  return res;
}
