export const runtime = "edge";

import type { NextApiRequest, NextApiResponse } from "next";
import { withSession } from "../../lib/session";
import { query } from "../../lib/db";

export default withSession(async function (req: NextApiRequest, res: NextApiResponse) {
  const { project, status } = req.query as { project?: string; status?: string };
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

  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";

  const units = await query<any>(
    `SELECT u.id, u.no, u.type, u.beds, u.area, u."view", u.status, u.price,
            p.code AS project_code, p.name AS project_name,
            b.name AS buyer
     FROM units u
     JOIN projects p ON p.id = u.project_id
     LEFT JOIN buyers b ON b.id = u.buyer_id
     ${where}
     ORDER BY p.code, u.no`
  , params);

  const summary = await query<any>(
    `SELECT u.status, COUNT(*)::int AS n FROM units u
     JOIN projects p ON p.id = u.project_id
     ${project && project !== "all" ? `WHERE p.code = $1` : ""}
     GROUP BY u.status ORDER BY u.status`
  , project && project !== "all" ? [project] : []);

  const projects = await query<any>(
    `SELECT code, name FROM projects ORDER BY code`
  );

  return res.status(200).json({ units: units.rows, summary: summary.rows, projects: projects.rows });
});