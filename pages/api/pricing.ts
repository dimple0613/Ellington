import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import type { Session } from "../../lib/session";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

const BANDS = ["L1-10", "L11-20", "L21-30", "L31-40", "L41-45"];

function num(v: unknown): number {
  const x = parseFloat(String(v ?? 0).replace(/,/g, ""));
  return isNaN(x) ? 0 : x;
}

function bandOf(floor: number): string {
  if (floor <= 10) return "L1-10";
  if (floor <= 20) return "L11-20";
  if (floor <= 30) return "L21-30";
  if (floor <= 40) return "L31-40";
  return "L41-45";
}

function floorOf(no: string): number {
  const m = String(no || "").match(/(\d{4})$/);
  if (!m) return 99;
  return parseInt(m[1].slice(0, 2), 10);
}

const UNSOLD = new Set(["available", "held", "blocked", "reserved"]);

function matchFilter(u: any, f: Record<string, unknown>): boolean {
  const kind = String(f.kind || "");
  const base = String(u.type || "").replace(/-.*/, "");
  switch (kind) {
    case "unsold_floors": {
      const fls = Array.isArray(f.floors) ? f.floors as number[] : [];
      return UNSOLD.has(String(u.status)) && fls.includes(floorOf(String(u.no)));
    }
    case "unsold_all":
      return UNSOLD.has(String(u.status));
    case "type":
      return base === String(f.type || "").replace(/-.*/, "");
    case "tower": {
      const t = String(f.tower || "T1").replace(/^t/i, "T");
      return String(u.no).includes("-" + (t.startsWith("T") ? t : "T" + t) + "-");
    }
    case "type_floors": {
      const fls = Array.isArray(f.floors) ? f.floors as number[] : [];
      return base === String(f.type || "").replace(/-.*/, "") && fls.includes(floorOf(String(u.no)));
    }
    default:
      return true;
  }
}

function loadUnits(projectId?: number) {
  return query<any>(
    `SELECT u.id, u.no, u.type, u.beds, u.area, u."view", u.status, u.price, p.code AS project_code
     FROM units u JOIN projects p ON p.id = u.project_id
     ${projectId ? "WHERE u.project_id = $1" : ""}
     ORDER BY p.code, u.no`,
    projectId ? [projectId] : []
  );
}

async function computeMatrix(units: any[]) {
  const byKey = new Map<string, { sum: number; n: number; sold: number }>();
  units.forEach((u) => {
    const typ = String(u.type || "").replace(/-.*/, "");
    if (!typ) return;
    const band = bandOf(floorOf(String(u.no)));
    const key = typ + "|" + band;
    const acc = byKey.get(key) || { sum: 0, n: 0, sold: 0 };
    const price = num(u.price);
    const area = num(u.area);
    if (area > 0) acc.sum += price / area;
    acc.n++;
    if (UNSOLD.has(String(u.status))) acc.sold += 0; else acc.sold += 1;
    byKey.set(key, acc);
  });
  const matrix = [] as any[];
  const typs: string[] = [];
  Array.from(byKey.keys()).forEach((k) => { const t = k.split("|")[0]; if (!typs.includes(t)) typs.push(t); });
  typs.forEach((typ, ti) => {
    const rows = BANDS.map((band, bi) => {
      const acc = byKey.get(typ + "|" + band);
      if (!acc) return { band, psf: 0, meta: "", bg: "#F1F2F6" };
      const psf = Math.round(acc.sum / acc.n);
      return {
        band,
        psf: psf.toLocaleString("en-US"),
        meta: acc.n + " units \u00b7 " + acc.sold + " sold",
        bg: `rgba(59,110,246,${Math.min(0.95, 0.12 + (bi / (BANDS.length - 1)) * 0.62).toFixed(2)})`,
      };
    });
    matrix.push({ typ, cells: rows });
    void ti;
  });
  return matrix;
}

export default withPerm("Inventory", "REA", async function (req: NextApiRequest, res: NextApiResponse, session: Session) {
  const body = (req.body || {}) as Record<string, unknown>;
  const code = String(body.project || body.code || (req.query.project as string) || "").toUpperCase();
  let projectId: number | undefined;
  if (code) {
    const proj = await query<{ id: number }>("SELECT id FROM projects WHERE code = $1 LIMIT 1", [code]);
    projectId = proj.rows[0]?.id;
  }

  if (req.method === "GET") {
    const units = await loadUnits(projectId);
    const matrix = await computeMatrix(units.rows);

    const revisions = projectId
      ? await query<any>(
          "SELECT id, change_type, pct, selection, effective_date, reason, status, requested_by, approved_by, approved_at, applied_at, created_at FROM price_revisions WHERE project_id = $1 ORDER BY id DESC LIMIT 12",
          [projectId]
        )
      : await query<any>("SELECT id, pct, selection, effective_date, reason, status, requested_by, approved_by, applied_at, created_at FROM price_revisions ORDER BY id DESC LIMIT 12");

    const phases = projectId
      ? await query<any>("SELECT id, name, unit_count, release_date, uplift_pct, status FROM release_phases WHERE project_id = $1 ORDER BY release_date NULLS LAST, id", [projectId])
      : await query<any>("SELECT id, name, unit_count, release_date, uplift_pct, status FROM release_phases ORDER BY release_date NULLS LAST, id LIMIT 20");

const settings = await query<{ pricing: any }>("SELECT pricing FROM app_settings WHERE id = 1");
    const pricing = (settings.rows[0]?.pricing) || { discount_rules: [], leakage: [] };
    const projects = code
      ? { rows: [] as { code: string; name: string }[] }
      : await query<any>("SELECT code, name FROM projects ORDER BY code");

    return ok(res, {
      matrix,
      revisions: revisions.rows.map((r: any) => ({
        id: r.id,
        change: (num(r.pct) > 0 ? "+" + r.pct : r.pct) + "% " + (r.change_type === "flat" ? "flat" : r.selection === "unsold" ? "on unsold" : "on " + r.selection),
        effective: r.effective_date ? String(r.effective_date) : "",
        by: r.requested_by || "",
        reason: r.reason || "",
        status: r.status,
        approved_by: r.approved_by,
        approved_at: r.approved_at,
        applied_at: r.applied_at,
      })),
      phases: phases.rows.map((p: any) => ({
        id: p.id,
        name: p.name,
        units: (p.unit_count ?? 0) + " units",
        when: p.release_date ? String(p.release_date).slice(0, 10) + " \u00b7 10:00" : "Rolling",
        uplift: p.uplift_pct ? (num(p.uplift_pct) > 0 ? "+" + p.uplift_pct + "%" : p.uplift_pct + "%") : "\u2014",
        status: p.status === "scheduled" ? "Scheduled" : p.status === "closed" ? "Closed" : "Live",
      })),
      discounts: pricing.discount_rules || [],
      leakage: pricing.leakage || [],
      matrixBand: { list: BANDS },
      projects: projects.rows,
      live: true,
    });
  }

  if (req.method === "POST") {
    if (!projectId) return fail(res, "project (code) is required");
    const action = String((req.body || {}).action || "");
    const projectCode = code;

    if (action === "preview" || action === "submit") {
      const pct = num((req.body as any).pct);
      const selection = (req.body as any).selection || {};
      const effective = String((req.body as any).effective || "");
      const reason = String((req.body as any).reason || "");
      if (!pct) return fail(res, "pct is required");

      const units = await loadUnits(projectId);
      const rows = units.rows
        .filter((u) => matchFilter(u, selection))
        .map((u) => ({
          unit_id: u.id,
          no: u.no,
          old_price: num(u.price),
          new_price: Math.round(num(u.price) * (1 + pct / 100)),
          confirmed: true,
        }));

      if (action === "preview") {
        return ok(res, { total: rows.length, rows: rows.slice(0, 20), gdv: rows.reduce((a, r) => a + (r.new_price - r.old_price), 0) });
      }

      const ins = await query<{ id: number }>(
        `INSERT INTO price_revisions (project_id, change_type, pct, selection, effective_date, reason, status, requested_by, payload)
         VALUES ($1, 'pct', $2, $3, $4, $5, 'pending_approval', $6, $7::jsonb) RETURNING id`,
        [projectId, pct, JSON.stringify(selection), effective || null, reason || "Required", session.full_name || session.email, JSON.stringify(rows)]
      );
      const revId = ins.rows[0].id;
      if (rows.length) {
        await query(
          `INSERT INTO audit_log (actor, module, action, entity, detail) VALUES ($1, 'Pricing', 'submit_revision', $2, $3)`,
          [session.full_name || session.email, "revision:" + revId, JSON.stringify({ project: projectCode, pct, count: rows.length })]
        ).catch(() => {});
      }
      return ok(res, { submitted: true, id: revId, total: rows.length, gdv: rows.reduce((a, r) => a + (r.new_price - r.old_price), 0) });
    }

    if (action === "approve") {
      const isApr = await hasPerm(session, "Inventory", "APR");
      if (!isApr) return res.status(403).json({ error: "You don't have permission to approve price revisions." });
      const id = Math.round(num((req.body as any).id));
      const rev = await query<any>("SELECT * FROM price_revisions WHERE id = $1 AND project_id = $2", [id, projectId]);
      if (!rev.rows.length) return fail(res, "Revision not found", 404);
      const r = rev.rows[0];
      if (r.status === "approved" || r.status === "applied") return ok(res, { applied: true, id, already: true });
      const payload = Array.isArray(r.payload) ? r.payload : [];
      if (payload.length) {
        for (const row of payload) {
          await query<any>(
            `UPDATE units SET price = $1
             FROM projects p
             WHERE units.id = $2 AND p.id = units.project_id AND p.id = $3
             RETURNING units.id`,
            [row.new_price, row.unit_id, projectId]
          );
          if (row.unit_id && row.new_price) {
            await query(
              `INSERT INTO price_rates (project_id, typology, band, rate)
               SELECT $1, u.type, $2, $3 / NULLIF(u.area, 0)
               FROM units u WHERE u.id = $4
               ON CONFLICT (project_id, typology, band) DO UPDATE SET rate = EXCLUDED.rate`,
              [projectId, bandOf(floorOf(String(row.no))), row.new_price, row.unit_id]
            ).catch(() => {});
          }
        }
      }
      await query(
        `UPDATE price_revisions SET status = 'applied', approved_by = $1, approved_at = now(), applied_at = now() WHERE id = $2`,
        [session.full_name || session.email, id]
      );
      await query(
        `INSERT INTO audit_log (actor, module, action, entity, detail) VALUES ($1, 'Pricing', 'approve_revision', $2, $3)`,
        [session.full_name || session.email, "revision:" + id, JSON.stringify({ project: projectCode, units: payload.length })]
      ).catch(() => {});
      return ok(res, { applied: true, id });
    }

    if (action === "phase") {
      const name = String((req.body as any).name || "");
      const unitCount = Math.round(num((req.body as any).unit_count));
      const releaseDate = String((req.body as any).release_date || "");
      const upliftPct = num((req.body as any).uplift_pct);
      if (!name) return fail(res, "name is required");
      const phase = await query<{ id: number }>(
        `INSERT INTO release_phases (project_id, name, unit_count, release_date, uplift_pct, status)
         VALUES ($1, $2, $3, $4, $5, 'scheduled') RETURNING id`,
        [projectId, name, unitCount, releaseDate ? releaseDate + " 10:00:00" : null, upliftPct]
      );
      return ok(res, { created: true, id: phase.rows[0].id });
    }

    return fail(res, "unknown action");
  }

  return methodNotAllowed(res);
});
