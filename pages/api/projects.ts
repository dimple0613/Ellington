import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";

export default withPerm("Inventory", "CRE", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { code, name, location, units_total, gdv } = req.body || {};
    if (!code || !name) return res.status(400).json({ error: "code and name are required" });

    const existing = await query<any>("SELECT id FROM projects WHERE code = upper($1)", [code]);
    if (existing.rows.length) return res.status(409).json({ error: "Project code already exists" });

    const ins = await query<any>(
      `INSERT INTO projects (code, name, location, status, units_total, gdv)
       VALUES (upper($1), $2, $3, 'launched', $4, $5) RETURNING id`,
      [code, name, location || null, parseInt(units_total, 10) || 0, gdv != null ? Number(gdv) : 0]
    );
    return res.status(201).json({ id: ins.rows[0].id });
  }

  return res.status(405).json({ error: "Method not allowed" });
});