import type { NextApiRequest, NextApiResponse } from "next";
import { withSession, Session } from "../../lib/session";
import { query } from "../../lib/db";

export default withSession(async function (_req: NextApiRequest, res: NextApiResponse, _session: Session) {
  const projects = await query<any>(
    `SELECT code, name, location, status, units_total, gdv, sold, collected, due_date
     FROM projects ORDER BY code`
  );

  const soldCounts = await query<any>(
    `SELECT p.code, COUNT(u.id)::int AS n
     FROM projects p
     LEFT JOIN units u ON u.project_id = p.id AND u.status IN ('sold','booked')
     GROUP BY p.code`
  );

  const countByCode: Record<string, number> = {};
  for (const row of soldCounts.rows) countByCode[row.code] = row.n;

  const data = projects.rows.map((p) => {
    const sold = countByCode[p.code] || 0;
    const soldV = Number(p.sold) || 0;
    const coll = soldV > 0 ? Math.round((Number(p.collected) / soldV) * 100) : 0;
    const cons = Number(p.gdv) > 0 ? Math.round((Number(p.collected) / Number(p.gdv)) * 100) : 0;
    const statusMap: Record<string, string> = {
      launched: "Launched",
      under_construction: "Under construction",
      handover: "In handover",
    };
    return {
      code: p.code,
      name: p.name,
      loc: p.location || "",
      units: Number(p.units_total) || 0,
      sold,
      gdv: Number(p.gdv) || 0,
      soldV,
      coll,
      cons,
      status: statusMap[p.status] || p.status || "",
      flag: false,
    };
  });

  res.status(200).json({ projects: data });
});
