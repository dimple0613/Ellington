import type { NextApiRequest, NextApiResponse } from "next";
import { generateResetToken, hashToken } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { sendPasswordReset } from "../../../lib/mail";
import { ok, fail, methodNotAllowed, validEmail, notFound } from "../../../lib/api";

const RESET_TTL_MS = 30 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return methodNotAllowed(res);
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !validEmail(email)) {
      return fail(res, "Please enter a valid email address.");
    }

    const found = await query<{ id: number }>("SELECT id FROM admins WHERE email = $1 LIMIT 1", [email]);
    if (found.rows.length === 0) {
      return notFound(res, "No account found with that email address.");
    }

    const token = generateResetToken();
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(Date.now() + RESET_TTL_MS);

    await query("DELETE FROM password_resets WHERE email = $1 AND used = false", [email]);
    await query(
      "INSERT INTO password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)",
      [email, tokenHash, expiresAt.toISOString()]
    );
    await sendPasswordReset(email, token);

    return ok(res, { message: "A password reset link has been sent to your email." });
  } catch (e: any) {
    console.error("FORGOT_PASSWORD_ERROR", e);
    return fail(res, "Password reset is temporarily unavailable. Please try again later.", 500);
  }
}