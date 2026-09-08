import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed, missingFields } from "../../lib/api";

export default withPerm("Inventory", "CRE", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const body = (req.body || {}) as Record<string, unknown>;
    const { code, name, location, units_total, gdv } = body;
    const miss = missingFields(body, ["code", "name"]);
    if (miss) return fail(res, miss);

    const existing = await query<any>("SELECT id FROM projects WHERE code = upper($1)", [code]);
    if (existing.rows.length) return fail(res, "Project code already exists", 409);

    const ins = await query<any>(
      `INSERT INTO projects (code, name, location, status, units_total, gdv)
       VALUES (upper($1), $2, $3, 'launched', $4, $5) RETURNING id`,
      [code, name, location || null, parseInt(units_total as string, 10) || 0, gdv != null ? Number(gdv) : 0]
    );
    return ok(res, { id: ins.rows[0].id }, 201);
  }

  return methodNotAllowed(res);
});