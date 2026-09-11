import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query, withTransaction } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";
import { fmtShortDate } from "../../lib/format";

const PDC_STATUSES = ["Held", "Presented", "Cleared", "Bounced"];

export default withPerm("Finance", "REA", async function (req: NextApiRequest, res: NextApiResponse, session: any) {
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
              r.cheque_no, r.cheque_date, r.bank_name, r.pdc_status,
              p.code AS project_code, p.name AS project_name,
              b.name AS buyer_name, u.no AS unit_no
       FROM receipts r
       JOIN projects p ON p.id = r.project_id
       LEFT JOIN buyers b ON b.id = r.buyer_id
       LEFT JOIN units u ON u.id = r.unit_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY r.received_at DESC`,
      params
    );

    const data = receipts.rows.map((r) => ({
      id: r.id,
      amount: Number(r.amount) || 0,
      method: r.method || "bank_transfer",
      reference: r.reference || "",
      matched: !!r.matched,
      date: fmtShortDate(r.received_at),
      project: r.project_code || "",
      buyer: r.buyer_name || "",
      unit: r.unit_no || "",
      cheque_no: r.cheque_no || "",
      cheque_date: fmtShortDate(r.cheque_date),
      bank_name: r.bank_name || "",
      pdc_status: r.pdc_status || "",
    }));
    return ok(res, { receipts: data });
  }

  if (req.method === "POST") {
    const { project_code, buyer_name, unit_no, amount, method, reference, cheque_no, cheque_date, bank_name, pdc_status } = req.body || {};
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

    const isCheque = String(method || "").toLowerCase().includes("cheque");
    const ins = await query<any>(
      `INSERT INTO receipts (project_id, unit_id, buyer_id, amount, method, reference, matched, cheque_no, cheque_date, bank_name, pdc_status)
       VALUES ($1,$2,$3,$4,$5,$6,false,$7,$8,$9,$10) RETURNING id`,
      [
        projectId, unitId, buyerId, amt, method || "bank_transfer", reference || null,
        cheque_no || null, cheque_date || null, bank_name || null,
        isCheque ? pdc_status || "Held" : pdc_status || null,
      ]
    );
    await query<any>(
      "UPDATE projects SET collected = collected + $2 WHERE id = $1",
      [projectId, amt]
    );
    await audit(session, "Finance", "Created", "Receipt RCP-" + String(ins.rows[0].id).padStart(6, "0"), "", "", method || "bank_transfer");
    return ok(res, { id: ins.rows[0].id }, 201);
  }

  if (req.method === "PUT") {
    const id = Number(req.query.id);
    if (!id) return fail(res, "Receipt id is required");

    const action = req.body?.action;
    if (action === "pdc") {
      const status = String(req.body?.status || "");
      if (!PDC_STATUSES.includes(status)) {
        return fail(res, "pdc-status must be one of " + PDC_STATUSES.join(" / "));
      }

      return withTransaction(async (q) => {
        const row = await q.query<any>(
          `SELECT r.id, r.amount, r.method, r.reference, r.cheque_no, r.pdc_status, r.project_id,
                  b.name AS buyer_name, u.no AS unit_no
           FROM receipts r
           LEFT JOIN buyers b ON b.id = r.buyer_id
           LEFT JOIN units u ON u.id = r.unit_id
           WHERE r.id = $1`,
          [id]
        );
        if (!row.rows.length) throw new Error("NOT_FOUND");

        const before = row.rows[0].pdc_status || "—";
        const wasBounced = before === "Bounced";
        const nowBounced = status === "Bounced";
        const amount = Number(row.rows[0].amount) || 0;
        const projectId = row.rows[0].project_id;

        // POST bumps projects.collected for every receipt (cheques included), so a bounce
        // must reverse that bump — and a later Cleared/Held re-collection bumps it again.
        if (projectId && nowBounced && !wasBounced) {
          await q.query("UPDATE projects SET collected = collected - $2 WHERE id = $1", [projectId, amount]);
        } else if (projectId && !nowBounced && wasBounced) {
          await q.query("UPDATE projects SET collected = collected + $2 WHERE id = $1", [projectId, amount]);
        }

        await q.query<any>("UPDATE receipts SET pdc_status = $1 WHERE id = $2", [status, id]);

        if (status === "Bounced") {
          await q.query<any>(
            `INSERT INTO collections (buyer, unit_no, amount, days_due, stage, action)
             VALUES ($1,$2,$3,0,'Final notice',$4)`,
            [
              row.rows[0].buyer_name || "Unknown · " + (row.rows[0].reference || ""),
              row.rows[0].unit_no || "",
              amount,
              "PDC bounced · " + (row.rows[0].cheque_no || "") + " · fee raised + dunning event",
            ]
          );
        }
        await audit(session, "Finance", "Updated", "PDC " + (row.rows[0].cheque_no || "RCP-" + id), "Status", before, status);
        return { id, status };
      })
        .then((r) => ok(res, r))
        .catch((e: any) => {
          if (e?.message === "NOT_FOUND") return fail(res, "Receipt not found", 404);
          return fail(res, "Failed to update PDC: " + (e?.message || e), 500);
        });
    }

    return fail(res, "Unknown action — expected pdc");
  }

  return methodNotAllowed(res);
});

async function audit(session: any, module: string, action: string, object: string, field: string, before: string, after: string) {
  try {
    await query(
      `INSERT INTO audit_log (actor, role, action, object, field, before_val, after_val)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [session.full_name || session.email || "user", session.role, action, object, field, before, after]
    );
  } catch {
    /* best-effort */
  }
}