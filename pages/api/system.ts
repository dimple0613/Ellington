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
      query<any>(
        `SELECT company, brand, numbering, notif, fx, vat, banks, templates, retention, pii, integrations
         FROM app_settings WHERE id = 1 LIMIT 1`
      ),
    ]);
    return ok(res, {
      audit: audit.rows,
      settings: settings.rows[0] || { company: {}, brand: {}, numbering: [], notif: [], fx: [], vat: {}, banks: [], templates: [], retention: [], pii: [], integrations: [] },
    });
  }

  if (req.method === "PUT") {
    if (!(await hasPerm(session, "Settings", "UPD"))) return fail(res, "Forbidden", 403);
    const { company, brand, numbering, notif, fx, vat, banks, templates, retention, pii, integrations } = req.body || {};
    const existing = await query<any>(
      `SELECT company, brand, numbering, notif, fx, vat, banks, templates, retention, pii, integrations
       FROM app_settings WHERE id = 1 LIMIT 1`
    );
    const prev = existing.rows[0] || { company: {}, brand: {}, numbering: [], notif: [], fx: [], vat: {}, banks: [], templates: [], retention: [], pii: [], integrations: [] };
    const merge = (current: unknown, inc: unknown) => typeof inc === "object" && inc !== null ? inc : current;
    const next = {
      company: merge(prev.company, company),
      brand: merge(prev.brand, brand),
      numbering: merge(prev.numbering, numbering),
      notif: merge(prev.notif, notif),
      fx: merge(prev.fx, fx),
      vat: merge(prev.vat, vat),
      banks: merge(prev.banks, banks),
      templates: merge(prev.templates, templates),
      retention: merge(prev.retention, retention),
      pii: merge(prev.pii, pii),
      integrations: merge(prev.integrations, integrations),
    };
    await query(
      `INSERT INTO app_settings (id, company, brand, numbering, notif, fx, vat, banks, templates, retention, pii, integrations)
       VALUES (1, $1::jsonb, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         company = EXCLUDED.company, brand = EXCLUDED.brand, numbering = EXCLUDED.numbering, notif = EXCLUDED.notif,
         fx = EXCLUDED.fx, vat = EXCLUDED.vat, banks = EXCLUDED.banks, templates = EXCLUDED.templates,
         retention = EXCLUDED.retention, pii = EXCLUDED.pii, integrations = EXCLUDED.integrations`,
      [JSON.stringify(next.company), JSON.stringify(next.brand), JSON.stringify(next.numbering), JSON.stringify(next.notif), JSON.stringify(next.fx), JSON.stringify(next.vat), JSON.stringify(next.banks), JSON.stringify(next.templates), JSON.stringify(next.retention), JSON.stringify(next.pii), JSON.stringify(next.integrations)]
    );
    return ok(res, { settings: next });
  }

  return methodNotAllowed(res);
});