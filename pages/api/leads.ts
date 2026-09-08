import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";

export function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    viewing: "Viewing",
    negotiation: "Negotiation",
    eoi: "EOI",
    booked: "Booked",
    lost: "Lost",
  };
  return map[stage] || stage || "New";
}

function stageIndex(stage: string): number {
  const order = ["new", "contacted", "qualified", "viewing", "negotiation", "eoi", "booked", "lost"];
  const i = order.indexOf((stage || "new").toLowerCase());
  return i >= 0 ? i : 0;
}

export default withPerm("Sales", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const leads = await query<any>(
      `SELECT l.id, l.name, COALESCE(l.source,'referral') AS source, COALESCE(l.stage,'new') AS stage,
              l.budget_min, l.budget_max, COALESCE(l.agent,'') AS agent, l.phone,
              p.code AS project_code
       FROM leads l
       LEFT JOIN projects p ON p.id = l.project_id
       ORDER BY l.stage_changed_at DESC NULLS LAST, l.id DESC`
    );
    const data = leads.rows.map((l) => ({
      id: l.id,
      name: l.name || "Unnamed lead",
      source: l.source,
      stage: l.stage,
      stageLabel: stageLabel(l.stage),
      stageIndex: stageIndex(l.stage),
      budgetMin: Number(l.budget_min) || 0,
      budgetMax: Number(l.budget_max) || 0,
      agent: l.agent,
      phone: l.phone || "",
      projectCode: l.project_code || "",
      live: stageIndex(l.stage) < 6,
    }));
    return res.status(200).json({ leads: data });
  }

  if (req.method === "POST") {
    const { name, source, phone, stage, budget_min, budget_max, agent, project_code } =
      req.body || {};
    if (!name) return res.status(400).json({ error: "name is required" });

    let projectId: number | null = null;
    if (project_code) {
      const pr = await query<any>("SELECT id FROM projects WHERE code = upper($1)", [project_code]);
      projectId = pr.rows.length ? pr.rows[0].id : null;
    }

    const ins = await query<any>(
      `INSERT INTO leads (project_id, name, source, phone, stage, budget_min, budget_max, agent)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
      [
        projectId,
        name,
        source || "referral",
        phone || null,
        stage || "new",
        budget_min != null ? Number(budget_min) : null,
        budget_max != null ? Number(budget_max) : null,
        agent || null,
      ]
    );
    return res.status(201).json({ id: ins.rows[0].id });
  }

  return res.status(405).json({ error: "Method not allowed" });
});