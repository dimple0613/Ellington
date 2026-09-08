import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

export default withPerm("Finance", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const project = (req.query.project as string) || "";
    const params: any[] = [];
    const where: string[] = [];
    if (project && project !== "all") {
      params.push(project);
      where.push("p.code = $1");
    }

    const receipts = await query<any>(
      `SELECT r.id, r.amount, r.method, r.reference, r.matched, r.received_at,
              p.code AS project_code, p.name AS project_name,
              b.name AS buyer_name, u.no AS unit_no
       FROM receipts r
       JOIN projects p ON p.id = r.project_id
       LEFT JOIN buyers b ON b.id = r.buyer_id
       LEFT JOIN units u ON u.id = r.unit_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY r.received_at DESC`
    );

    const data = receipts.rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount) || 0,
      method: r.method || "bank_transfer",
      reference: r.reference || "",
      matched: !!r.matched,
      date: new Date(r.received_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }),
      project: r.project_code || "",
      buyer: r.buyer_name || "",
      unit: r.unit_no || "",
    }));
    return ok(res, { receipts: data });
  }

  if (req.method === "POST") {
    const { project_code, buyer_name, unit_no, amount, method, reference } = req.body || {};
    const amt = Number(amount);
    if (!project_code || !(amt > 0)) {
      return fail(res, "project_code and amount are required");
    }

    const pr = await query<any>("SELECT id FROM projects WHERE code = upper($1)", [project_code]);
    if (!pr.rows.length) return fail(res, "Unknown project");
    const projectId = pr.rows[0].id;

    let buyerId: number | null = null;
    if (buyer_name) {
      const b = await query<any>(
        "SELECT id FROM buyers WHERE lower(name) = lower($1) LIMIT 1",
        [buyer_name]
      );
      if (!b.rows.length) {
        const nb = await query<any>(
          "INSERT INTO buyers (name, kyc_status) VALUES ($1,'pending') RETURNING id",
          [buyer_name]
        );
        buyerId = nb.rows[0].id;
      } else {
        buyerId = b.rows[0].id;
      }
    }

    let unitId: number | null = null;
    if (unit_no) {
      const u = await query<any>(
        "SELECT id FROM units WHERE no = $1 AND project_id = $2 LIMIT 1",
        [unit_no, projectId]
      );
      if (u.rows.length) unitId = u.rows[0].id;
    }

    const ins = await query<any>(
      `INSERT INTO receipts (project_id, unit_id, buyer_id, amount, method, reference, matched)
       VALUES ($1,$2,$3,$4,$5,$6,false) RETURNING id`,
      [projectId, unitId, buyerId, amt, method || "bank_transfer", reference || null]
    );
    await query<any>(
      "UPDATE projects SET collected = collected + $2 WHERE id = $1",
      [projectId, amt]
    );
    return ok(res, { id: ins.rows[0].id }, 201);
  }

  return methodNotAllowed(res);
});