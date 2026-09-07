import type { NextApiRequest, NextApiResponse } from "next";
import { generateResetToken, hashToken } from "../../../lib/auth";
import { query } from "../../../lib/db";
import { sendPasswordReset } from "../../../lib/mail";

const RESET_TTL_MS = 30 * 60 * 1000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    // Never reveal whether the account exists: same response either way.
    const found = await query<{ id: number }>("SELECT id FROM admins WHERE email = $1 LIMIT 1", [email]);
    if (found.rows.length > 0) {
      const token = generateResetToken();
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + RESET_TTL_MS);

      await query("DELETE FROM password_resets WHERE email = $1 AND used = false", [email]);
      await query(
        "INSERT INTO password_resets (email, token_hash, expires_at) VALUES ($1, $2, $3)",
        [email, tokenHash, expiresAt.toISOString()]
      );
      await sendPasswordReset(email, token);
    }

    return res.status(200).json({
      ok: true,
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (e: any) {
    console.error("FORGOT_PASSWORD_ERROR", e);
    return res.status(500).json({ error: "Password reset is temporarily unavailable. Please try again later." });
  }
}