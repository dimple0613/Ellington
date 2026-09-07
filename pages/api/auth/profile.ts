import type { NextApiRequest, NextApiResponse } from "next";
import { withSession, Session } from "../../../lib/session";
import { query } from "../../../lib/db";
import { hashPassword, verifyPassword, validatePasswordStrength } from "../../../lib/auth";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default withSession(async function handler(req: NextApiRequest, res: NextApiResponse, session: Session) {
  try {
    if (req.method !== "PUT") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const admin = await query<{ id: number; full_name: string; email: string; password_hash: string; role: string }>(
      "SELECT id, full_name, email, password_hash, role FROM admins WHERE id = $1 LIMIT 1",
      [session.userId]
    );
    if (admin.rows.length === 0) {
      return res.status(401).json({ error: "Account no longer exists. Please sign in again." });
    }
    const existing = admin.rows[0];

    const fullName = typeof req.body?.full_name === "string" ? req.body.full_name.trim() : existing.full_name;
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : existing.email;
    const currentPassword = typeof req.body?.current_password === "string" ? req.body.current_password : "";
    const newPassword = typeof req.body?.new_password === "string" ? req.body.new_password : "";

    const emailChanged = email !== existing.email;
    const passwordChanged = newPassword.length > 0;

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!fullName || fullName.length > 80) {
      return res.status(400).json({ error: "Name must be between 1 and 80 characters." });
    }

    // Updating login credentials requires the current password as proof.
    if (emailChanged || passwordChanged) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Enter your current password to update your credentials." });
      }
      const valid = await verifyPassword(currentPassword, existing.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Current password is incorrect." });
      }
    }

    if (emailChanged) {
      const clash = await query<{ id: number }>(
        "SELECT id FROM admins WHERE email = lower($1) AND id <> $2 LIMIT 1",
        [email, existing.id]
      );
      if (clash.rows.length > 0) {
        return res.status(409).json({ error: "That email is already registered to another account." });
      }
    }

    let newHash: string | null = null;
    if (passwordChanged) {
      const strength = validatePasswordStrength(newPassword);
      if (!strength.ok) {
        return res.status(400).json({ error: strength.errors[0] });
      }
      newHash = await hashPassword(newPassword);
    }

    await query("UPDATE admins SET full_name = $1, email = $2, password_hash = $3 WHERE id = $4", [
      fullName,
      email,
      newHash ?? existing.password_hash,
      existing.id,
    ]);

    return res.status(200).json({
      ok: true,
      user: { userId: existing.id, full_name: fullName, email, role: existing.role },
    });
  } catch (e: any) {
    console.error("PROFILE_UPDATE_ERROR", e);
    return res.status(500).json({ error: "Could not update your profile. Please try again." });
  }
});