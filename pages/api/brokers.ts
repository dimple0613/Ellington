import type { NextApiRequest, NextApiResponse } from "next";
import { ok, fail, missingFields } from "../../lib/api";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";

const num = (v: unknown) => Number(v ?? 0);

/**
 * /api/brokers — brokers & agencies (T15).
 * GET   → agencies register + agents + activity feed + aggregated KPIs.
 * POST  → onboard a new agency (status onboarding) and log activity.
 * PUT   → ?id=<agencyId>&action=activate|suspend  (toggles agency status, logs activity).
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return getBrokers(req, res);
  if (req.method === "POST") return onboardAgency(req, res);
  if (req.method === "PUT") return setAgencyStatus(req, res);
  return fail(res, "Method not allowed", 405);
}

async function getBrokers(req: NextApiRequest, res: NextApiResponse) {
  try {
    const [ag, ags, act] = await Promise.all([
      query<any>("SELECT id, name, orn, alloc_units, deals, accrued, paid, commission_rate AS rate, status FROM broker_agencies ORDER BY id"),
      query<any>("SELECT id, name, agency, brn, deals, value, discount_pct, days_to_close FROM broker_agents ORDER BY id"),
      query<any>("SELECT id, text, meta, kind, created_at FROM broker_activity ORDER BY created_at DESC, id DESC LIMIT 50"),
    ]);
    const rows = ag.rows;
    const kpis = {
      agencies: rows.length,
      pending: rows.filter((r) => r.status === "onboarding").length,
      alloc_units: rows.reduce((a: number, r: any) => a + num(r.alloc_units), 0),
      deals: rows.reduce((a: number, r: any) => a + num(r.deals), 0),
      accrued: rows.reduce((a: number, r: any) => a + num(r.accrued), 0),
      unpaid: rows.reduce((a: number, r: any) => a + (num(r.accrued) - num(r.paid)), 0),
    };
    return ok(res, { kpis, agencies: rows, agents: ags.rows, activity: act.rows });
  } catch (e: any) {
    return fail(res, "Failed to load brokers: " + (e?.message || e), 500);
  }
}

async function onboardAgency(req: NextApiRequest, res: NextApiResponse) {
  const b = req.body || {};
  const missing = missingFields(b, ["name", "orn"]);
  if (missing) return fail(res, missing, 400);
  const rate = b.commission_rate || "2.0%";
  try {
    const ins = await query<any>(
      `INSERT INTO broker_agencies (name, orn, commission_rate, status)
       VALUES ($1, $2, $3, 'onboarding') RETURNING id, name`,
      [String(b.name), String(b.orn), rate]
    );
    await query(
      `INSERT INTO broker_activity (text, meta, kind) VALUES ($1, $2, 'onboard')`,
      ["Onboard submitted · " + ins.rows[0].name, "ORN " + String(b.orn) + " · " + rate + " · docs 4/6 sent for review"]
    );
    return ok(res, { id: ins.rows[0].id, name: ins.rows[0].name, status: "onboarding" }, 201);
  } catch (e: any) {
    if (String(e?.message || "").includes("duplicate")) {
      return fail(res, "Agency with that trade name already registered", 400);
    }
    return fail(res, "Failed to onboard agency: " + (e?.message || e), 500);
  }
}

async function setAgencyStatus(req: NextApiRequest, res: NextApiResponse) {
  const id = num(req.query.id);
  if (!id) return fail(res, "Invalid agency id", 400);
  const action = String(req.body?.action || "");
  if (!["activate", "suspend"].includes(action)) return fail(res, "Unknown agency action", 400);
  try {
    const next = action === "activate" ? "active" : "suspended";
    const upd = await query<any>(
      `UPDATE broker_agencies SET status = $2, updated_at = now() WHERE id = $1 RETURNING name, status`,
      [id, next]
    );
    if (upd.rows.length === 0) return fail(res, "Agency not found", 404);
    await query(
      `INSERT INTO broker_activity (text, meta, kind) VALUES ($1, $2, $3)`,
      [
        (next === "active" ? "Agency reinstated" : "Agency suspended") + " · " + upd.rows[0].name,
        upd.rows[0].name + " is now " + next,
        next === "active" ? "note" : "suspend",
      ]
    );
    return ok(res, { id, name: upd.rows[0].name, status: next });
  } catch (e: any) {
    return fail(res, "Failed to update agency: " + (e?.message || e), 500);
  }
}

export default withPerm("Sales", "REA", handler);