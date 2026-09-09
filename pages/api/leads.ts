import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed, missingFields, notFound } from "../../lib/api";

const STAGE_ORDER = ["new", "contacted", "qualified", "viewing", "negotiation", "eoi", "booked", "lost"];

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
  const i = STAGE_ORDER.indexOf((stage || "new").toLowerCase());
  return i >= 0 ? i : 0;
}

export default withPerm("Sales", "REA", async function (req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method === "GET") {
    const leads = await query<any>(
      `SELECT l.id, l.name, COALESCE(l.source,'referral') AS source, COALESCE(l.stage,'new') AS stage,
              l.budget_min, l.budget_max, COALESCE(l.agent,'') AS agent, l.phone,
              l.discount_pct, l.days_to_close,
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
      discountPct: l.discount_pct != null ? Number(l.discount_pct) : null,
      daysToClose: l.days_to_close != null ? Number(l.days_to_close) : null,
      live: stageIndex(l.stage) < 6,
    }));
    return ok(res, { leads: data });
  }

  if (req.method === "POST") {
    const body = (req.body || {}) as Record<string, unknown>;
    const { name, source, phone, stage, budget_min, budget_max, agent, project_code } = body;
    const miss = missingFields(body, ["name"]);
    if (miss) return fail(res, miss);

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
    return ok(res, { id: ins.rows[0].id }, 201);
  }

  if (req.method === "PUT") {
    if (!(await hasPerm(session, "Sales", "UPD"))) {
      return fail(res, "You don't have permission to perform this action.", 403);
    }
    const id = Number(req.query.id);
    if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid lead id", 400);
    const stage = String((req.body || {}).stage || "").toLowerCase();
    if (!STAGE_ORDER.includes(stage)) {
      return fail(res, "Invalid stage: " + (STAGE_ORDER.join(", ")), 400);
    }
    const upd = await query<any>(
      `UPDATE leads SET stage = $2, stage_changed_at = now() WHERE id = $1 RETURNING id`,
      [id, stage]
    );
    if (upd.rows.length === 0) return notFound(res, "Lead not found");
    return ok(res, { id: upd.rows[0].id, stage });
  }

  return methodNotAllowed(res);
});