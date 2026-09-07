import { hashPassword } from "./auth";
import { query } from "./db";

/**
 * Ensures the admin account configured in the environment (ADMIN_EMAIL /
 * ADMIN_PASSWORD) exists in the database, so authentication features
 * automatically follow the email set in .env with no code changes.
 *
 * - No-op when ADMIN_EMAIL is not set or the row already exists.
 * - Inserts the env-configured admin when missing (idempotent; never
 *   deletes or renames existing rows).
 */
export async function ensureEnvAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!email) return;

  const existing = await query<{ id: number }>("SELECT id FROM admins WHERE email = $1 LIMIT 1", [email]);
  if (existing.rows.length > 0) return;

  const password = process.env.ADMIN_PASSWORD || "admin123";
  const hash = await hashPassword(password);
  await query(
    "INSERT INTO admins (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)",
    ["Super Admin", email, hash, "super_admin"]
  );
}