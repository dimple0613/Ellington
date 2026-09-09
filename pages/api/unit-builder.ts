import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import type { Session } from "../../lib/session";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

type TypeRule = { type: string; beds: number | string; area: number | string; price: number | string };
type CsvRow = { no?: string; type: string; beds?: number | string; area?: number | string; view?: string; price: number | string };

function num(v: unknown): number {
  const s = String(v ?? 0).replace(/,/g, "").trim();
  const x = parseFloat(s);
  return isNaN(x) ? 0 : x;
}

function pad(n: number, w: number): string {
  return String(n).padStart(w, "0");
}

const VIEWS = ["Park", "Canal", "Skyline", "Creek"];

function buildUnits(projectCode: string, tower: string, startFloor: number, endFloor: number, per: number, types: TypeRule[], uplift: number) {
  const rows: CsvRow[] = [];
  const base = projectCode.toUpperCase();
  const tn = /^T/i.test(tower) ? tower : "T" + tower;
  const prefix = `${base}-${tn}-`;
  let k = 0;
  for (let f = startFloor; f <= endFloor; f++) {
    for (let i = 0; i < per; i++) {
      const t = types[k % Math.max(1, types.length)];
      const floorUplift = uplift > 0 ? f - startFloor : 0;
      rows.push({
        no: prefix + pad(f, 2) + pad(i + 1, 2),
        type: t?.type || "2BR",
        beds: Math.max(0, Math.round(num(t?.beds)) || 1),
        area: Math.max(0, num(t?.area) || 700),
        view: VIEWS[k % VIEWS.length],
        price: Math.round((num(t?.price) || 0) * (1 + floorUplift * (uplift / 100))),
      });
      k++;
    }
  }
  return rows;
}

function insertUnits(projectId: number, rows: CsvRow[]) {
  const COLS = 8;
  const params: any[] = [];
  const placeholders: string[] = [];
  rows.forEach((r, i) => {
    const base = i * COLS;
    placeholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
    );
    params.push(
      projectId,
      r.no,
      r.type,
      r.beds != null ? Math.round(num(r.beds)) : null,
      r.area != null ? num(r.area) : null,
      r.view || null,
      num(r.price),
      "available"
    );
  });
  return query<{ id: number }>(
    `INSERT INTO units (project_id, no, type, beds, area, "view", price, status)
     VALUES ${placeholders.join(",")}
     ON CONFLICT (project_id, no) DO NOTHING
     RETURNING id`,
    params
  );
}

export default withPerm("Inventory", "CRE", async function (req: NextApiRequest, res: NextApiResponse, session: Session) {
  if (req.method === "GET") {
    const code = (req.query.project as string) || "";
    const proj = await query<any>(
      `SELECT id, code, name, COALESCE(setup, '{}'::jsonb) AS setup,
              (SELECT COUNT(*)::int FROM units u WHERE u.project_id = projects.id) AS existing
       FROM projects ${code ? "WHERE code = $1" : ""} ORDER BY code`,
      code ? [code.toUpperCase()] : []
    );
    return ok(res, { projects: proj.rows });
  }

  if (req.method === "POST") {
    const body = (req.body || {}) as Record<string, unknown>;
    const code = String(body.code || body.project || "").toUpperCase();
    if (!code) return fail(res, "code is required");
    const mode = body.mode === "csv" ? "csv" : "rules";
    const preview = body.preview === true;

    const proj = await query<{ id: number }>(
      "SELECT id FROM projects WHERE code = $1 LIMIT 1",
      [code]
    );
    if (!proj.rows.length) return fail(res, "Unknown project", 404);
    const projectId = proj.rows[0].id;

    let rows: CsvRow[];
    if (mode === "csv") {
      rows = Array.isArray(body.rows) ? (body.rows as CsvRow[]) : [];
    } else {
      const tower = String(body.tower || "T1");
      const startFloor = Math.max(1, Math.round(num(body.startFloor)));
      const endFloor = Math.max(startFloor, Math.round(num(body.endFloor)));
      const per = Math.max(1, Math.round(num(body.unitsPerFloor)));
      const types = (Array.isArray(body.types) ? body.types : []) as TypeRule[];
      const uplift = num(body.uplift);
      if (!types.length) return fail(res, "Add at least one unit type");
      if (!startFloor || !endFloor || !per) return fail(res, "Floor range and units-per-floor are required");
      rows = buildUnits(code, tower, startFloor, endFloor, per, types, uplift);
    }

    if (!rows.length) return fail(res, "No units to create");
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.no || !String(r.type).trim()) return fail(res, "Every row needs a unit no and type (row " + (i + 1) + ")");
    }

    const existing = await query<{ no: string }>(
      "SELECT no FROM units WHERE project_id = $1 AND no = ANY($2)",
      [projectId, rows.map((r) => r.no as string)]
    );
    const existingNoSet = new Set(existing.rows.map((r) => r.no));
    const conflicts = rows.filter((r) => r.no && existingNoSet.has(r.no));
    const clean = rows.filter((r) => !r.no || !existingNoSet.has(r.no));

    if (preview) {
      return ok(res, {
        preview: true,
        project: code,
        total: rows.length,
        conflicts: conflicts.length,
        conflicting: conflicts.slice(0, 12).map((r) => r.no),
        sample: rows.slice(0, 24),
        gdv: rows.reduce((a, r) => a + num(r.price), 0),
      });
    }

    let inserted = 0;
    let gdv = 0;
    if (clean.length) {
      const result = await insertUnits(projectId, clean);
      inserted = result.rows.length;
      gdv = clean.reduce((a, r) => a + num(r.price), 0);
    }

    return ok(res, { written: true, project: code, inserted, skipped: conflicts.length, gdv });
  }

  return methodNotAllowed(res);
});