import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, methodNotAllowed } from "../../lib/api";

export default withPerm("Finance", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const unitNo = (req.query.unit as string) || "";
    const params: any[] = [];
    const where: string[] = [];
    if (unitNo) {
      params.push(unitNo);
      where.push("u.no = $1");
    }

    const milestones = await query<any>(
      `SELECT m.id, u.no AS unit_no, p.code AS project_code, m.milestone, m.due_date,
              m."percent", m.amount, m.status
       FROM payment_milestones m
       JOIN units u ON u.id = m.unit_id
       JOIN projects p ON p.id = u.project_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY m.due_date`,
      params
    );

    const data = milestones.rows.map((m) => ({
      id: m.id,
      unit: m.unit_no || "",
      project: m.project_code || "",
      milestone: m.milestone,
      due: m.due_date ? String(m.due_date).slice(0, 10) : "",
      percent: Number(m.percent) || 0,
      amount: Number(m.amount) || 0,
      status: m.status || "scheduled",
    }));
    return ok(res, { milestones: data });
  }

  return methodNotAllowed(res);
});