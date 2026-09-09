import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

export default withPerm("Settings", "REA", async function (req: NextApiRequest, res: NextApiResponse, session) {
  if (req.method === "GET") {
    const [audit, settings] = await Promise.all([
      query<any>(
        `SELECT ts, actor, role, action, object, field, before_val, after_val, sensitive
         FROM audit_log ORDER BY ts DESC LIMIT 200`
      ),
      query<any>("SELECT company, brand, numbering, notif FROM app_settings WHERE id = 1 LIMIT 1"),
    ]);
    return ok(res, {
      audit: audit.rows,
      settings: settings.rows[0] || { company: {}, brand: {}, numbering: [], notif: [] },
    });
  }

  if (req.method === "PUT") {
    if (!(await hasPerm(session, "Settings", "UPD"))) return fail(res, "Forbidden", 403);
    const { company, brand, numbering, notif } = req.body || {};
    if (!company && !brand && !numbering && !notif) {
      return fail(res, "company, brand, numbering or notif object is required");
    }
    const existing = await query<any>("SELECT company, brand, numbering, notif FROM app_settings WHERE id = 1 LIMIT 1");
    const prev = existing.rows[0] || { company: {}, brand: {}, numbering: [], notif: [] };
    const nextCompany = company && typeof company === "object" ? company : prev.company;
    const nextBrand = brand && typeof brand === "object" ? brand : prev.brand;
    const nextNumbering = numbering && typeof numbering === "object" ? numbering : prev.numbering;
    const nextNotif = notif && typeof notif === "object" ? notif : prev.notif;
    await query(
      `INSERT INTO app_settings (id, company, brand, numbering, notif) VALUES (1, $1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb)
       ON CONFLICT (id) DO UPDATE SET company = EXCLUDED.company, brand = EXCLUDED.brand, numbering = EXCLUDED.numbering, notif = EXCLUDED.notif`,
      [JSON.stringify(nextCompany), JSON.stringify(nextBrand), JSON.stringify(nextNumbering), JSON.stringify(nextNotif)]
    );
    return ok(res, { settings: { company: nextCompany, brand: nextBrand, numbering: nextNumbering, notif: nextNotif } });
  }

  return methodNotAllowed(res);
});