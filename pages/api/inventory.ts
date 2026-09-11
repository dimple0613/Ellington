import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default withPerm("Inventory", "REA", async function (req: NextApiRequest, res: NextApiResponse, session) {
  if (req.method === "GET") return listInventory(req, res);
  if (req.method === "PUT") {
    if (!(await hasPerm(session, "Inventory", "UPD"))) {
      return res.status(403).json({ error: "You don't have permission to update units." });
    }
    return updateUnit(req, res, session);
  }
  return methodNotAllowed(res);
});

async function listInventory(req: NextApiRequest, res: NextApiResponse) {
  const project = (req.query.project as string) || "all";
  const status = (req.query.status as string) || "all";
  const unit = (req.query.unit as string) || "all";

  const conds: string[] = [];
  const params: any[] = [];

  if (project && project !== "all") {
    params.push(project);
    conds.push(`p.code = $${params.length}`);
  }
  if (status && status !== "all") {
    params.push(status);
    conds.push(`u.status = $${params.length}`);
  }
  if (unit && unit !== "all") {
    params.push(unit);
    conds.push(`u.id::text = $${params.length}`);
  }

  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

  const units = await query<any>(
    `SELECT u.id, u.no, u.type, u.beds, u.area, u."view", u.status, u.price, u.oqood_no,
            p.code AS project_code, p.name AS project_name,
            b.name AS buyer
     FROM units u
     JOIN projects p ON p.id = u.project_id
     LEFT JOIN buyers b ON b.id = u.buyer_id
     ${where}
     ORDER BY p.code, u.no`,
    params
  );

  const summary = await query<any>(
    `SELECT u.status, COUNT(*)::int AS n FROM units u
     JOIN projects p ON p.id = u.project_id
     ${project && project !== "all" ? `WHERE p.code = $1` : ""}
     GROUP BY u.status ORDER BY u.status`,
    project && project !== "all" ? [project] : []
  );

  const projects = await query<any>(
    `SELECT code, name FROM projects WHERE lower(name) NOT LIKE '%test%' ORDER BY code`
  );

  ok(res, { units: units.rows, summary: summary.rows, projects: projects.rows });
}

/**
 * RC-01: a unit can only be moved to `sold` when an Oqood reference is recorded
 * on the unit (blocking rule, never a warning). Oqood may be supplied with the
 * transition or pre-existing; both are persisted. Every status change is audited.
 */
async function updateUnit(req: NextApiRequest, res: NextApiResponse, session: { role: string; full_name?: string | null; email?: string | null }) {
  const id = Number(req.body?.unit_id ?? req.query?.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid unit id", 400);

  const target = String(req.body?.status || "").trim();
  if (!target) return fail(res, "status is required", 400);

  const suppliedOqood = req.body?.oqood_no != null ? String(req.body.oqood_no).trim() : null;

  try {
    const { rows } = await query<any>("SELECT id, no, status, oqood_no FROM units WHERE id = $1", [id]);
    if (rows.length === 0) return fail(res, "Unit not found", 404);
    const u = rows[0];

    const current = u.status || "available";
    if (current === target && !suppliedOqood) return ok(res, { id, status: current, oqood_no: u.oqood_no });

    const before = current;
    let oqoodNo = u.oqood_no || null;
    if (suppliedOqood) oqoodNo = suppliedOqood;

    if (target === "sold" && !oqoodNo) {
      return fail(
        res,
        "Oqood reference required to mark a unit as sold (blocking rule). Record the Oqood / RERA registration reference (e.g. OQD-xxxx) before the sale can register.",
        400
      );
    }

    await query(
      "UPDATE units SET status = $2, oqood_no = $3, held_until = CASE WHEN $2 = 'available' THEN NULL ELSE held_until END, updated_at = now() WHERE id = $1",
      [id, target, oqoodNo]
    );

    await query(
      `INSERT INTO audit_log (ts, actor, role, action, object, field, before_val, after_val, sensitive)
       VALUES (now(), $1, $2, $3, $4, 'status', $5, $6, false)`,
      [session.full_name || session.email || "system", session.role, "Updated", "Unit " + u.no, before, target]
    );

    return ok(res, { id, no: u.no, status: target, oqood_no: oqoodNo });
  } catch (e: any) {
    return fail(res, "Failed to update unit: " + (e?.message || e), 500);
  }
}