import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

export default withPerm("Settings", "REA", async function (req: NextApiRequest, res: NextApiResponse, session) {
  if (req.method === "GET") {
    const [audit, settings] = await Promise.all([
      query<{
        ts: string | Date;
        actor: string;
        role: string;
        action: string;
        object: string;
        field: string | null;
        before_val: string | null;
        after_val: string | null;
        sensitive: boolean | null;
      }>(
        `SELECT ts, actor, role, action, object, field, before_val, after_val, sensitive
         FROM audit_log ORDER BY ts DESC LIMIT 200`
      ),
      query<{ company: Record<string, unknown> | null; brand: Record<string, unknown> | null }>(
        "SELECT company, brand FROM app_settings WHERE id = 1 LIMIT 1"
      ),
    ]);
    return ok(res, {
      audit: audit.rows,
      settings: settings.rows[0] || { company: {}, brand: {} },
    });
  }

  if (req.method === "PUT") {
    if (!(await hasPerm(session, "Settings", "UPD"))) return fail(res, "Forbidden", 403);
    const company = req.body?.company;
    const brand = req.body?.brand;
    if ((!company || typeof company !== "object") && (!brand || typeof brand !== "object")) {
      return fail(res, "company or brand object is required");
    }
    const existing = await query<{ company: Record<string, unknown> | null; brand: Record<string, unknown> | null }>(
      "SELECT company, brand FROM app_settings WHERE id = 1 LIMIT 1"
    );
    const prev = existing.rows[0] || { company: {}, brand: {} };
    const nextCompany = company && typeof company === "object" ? company : prev.company;
    const nextBrand = brand && typeof brand === "object" ? brand : prev.brand;
    await query(
      `INSERT INTO app_settings (id, company, brand) VALUES (1, $1::jsonb, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET company = EXCLUDED.company, brand = EXCLUDED.brand`,
      [JSON.stringify(nextCompany), JSON.stringify(nextBrand)]
    );
    return ok(res, { settings: { company: nextCompany, brand: nextBrand } });
  }

  return methodNotAllowed(res);
});