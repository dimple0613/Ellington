import type { NextApiRequest, NextApiResponse } from "next";
import { hashPassword, hashToken, validatePasswordStrength } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { ok, fail, methodNotAllowed } from "../../../lib/api";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return methodNotAllowed(res);
    }
    const token = String(req.body?.token || "").trim();
    const password = String(req.body?.password || "");

    if (!token || !password) {
      return fail(res, "Reset token and new password are required.");
    }
    const strength = validatePasswordStrength(password);
    if (!strength.ok) {
      return fail(res, strength.errors[0]);
    }

    const tokenHash = await hashToken(token);
    const now = new Date();
    const match = await query<{ email: string; expires_at: string }>(
      `SELECT email, expires_at FROM password_resets
       WHERE token_hash = $1 AND used = false AND expires_at > $2
       LIMIT 1`,
      [tokenHash, now.toISOString()]
    );
    if (match.rows.length === 0) {
      return fail(res, "This reset link is invalid or has expired. Please request a new one.");
    }

    const email = match.rows[0].email;

    // The admin may have changed their email after requesting the reset (profile
    // update); in that case the token no longer applies.
    const adminNow = await query<{ id: number }>("SELECT id FROM admins WHERE email = $1 LIMIT 1", [email]);
    if (adminNow.rows.length === 0) {
      return fail(res, "This reset link is invalid or has expired. Please request a new one.");
    }

    const newPasswordHash = await hashPassword(password);
    await query("UPDATE admins SET password_hash = $1 WHERE email = $2", [newPasswordHash, email]);
    await query("UPDATE password_resets SET used = true WHERE email = $1 AND used = false", [email]);

    return ok(res, { message: "Your password has been updated. You can now sign in." });
  } catch (e: any) {
    console.error("RESET_PASSWORD_ERROR", e);
    return fail(res, "Password reset is temporarily unavailable. Please try again later.", 500);
  }
}