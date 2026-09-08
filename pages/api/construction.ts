import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

export default withPerm("Construction", "REA", async function (req: NextApiRequest, res: NextApiResponse, session) {
  if (req.method === "GET") {
    const project = (req.query.project as string) || "all";
    const conds: string[] = [];
    const params: any[] = [];
    if (project && project !== "all") {
      params.push(project);
      conds.push(`p.code = $${params.length}`);
    }
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
    const rows = await query<any>(
      `SELECT cm.id, p.code AS project, cm.milestone, cm.planned, cm.forecast, cm.actual,
              cm.status, cm.weight, cm.planned_pct, cm.actual_pct, cm.trigger_amt, cm.trigger_buyers
       FROM construction_milestones cm
       JOIN projects p ON p.id = cm.project_id
       ${where}
       ORDER BY cm.planned, cm.id`
    );
    return ok(res, {
      milestones: rows.rows.map((r) => ({
        id: r.id,
        project: r.project,
        milestone: r.milestone,
        planned: r.planned ? String(r.planned).slice(0, 10) : "",
        forecast: r.forecast ? String(r.forecast).slice(0, 10) : "",
        actual: r.actual ? String(r.actual).slice(0, 10) : "",
        status: r.status || "pending",
        weight: Number(r.weight) || 0,
        planned_pct: Number(r.planned_pct) || 0,
        actual_pct: Number(r.actual_pct) || 0,
        trigger_amt: Number(r.trigger_amt) || 0,
        trigger_buyers: Number(r.trigger_buyers) || 0,
      })),
    });
  }

  if (req.method === "PUT") {
    if (!(await hasPerm(session, "Construction", "UPD"))) return fail(res, "Forbidden", 403);
    const id = Number(req.body?.id);
    if (!id) return fail(res, "milestone id is required");
    const cur = await query<any>(
      "SELECT project_id, milestone, forecast, planned_pct, status FROM construction_milestones WHERE id = $1",
      [id]
    );
    if (!cur.rows.length) return fail(res, "milestone not found", 404);
    const m = cur.rows[0];
    if (m.status === "certified") return fail(res, "already certified");
    await query(
      `UPDATE construction_milestones
       SET status = 'certified', actual = COALESCE(actual, forecast), actual_pct = planned_pct
       WHERE id = $1`,
      [id]
    );
    await query(
      `INSERT INTO audit_log (actor, role, action, object, field, before_val, after_val)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [session.full_name || session.email || "user", session.role, "Certified", "Construction \u00b7 " + m.milestone, "Status", m.status, "certified"]
    );
    return ok(res, { certified: true, milestone: m.milestone });
  }

  return methodNotAllowed(res);
});