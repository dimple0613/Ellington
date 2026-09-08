import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed, missingFields, notFound } from "../../lib/api";

const RERA_STATES = ["Draft", "Submitted", "Approved"];

export default withPerm("Finance", "REA", async function (req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method === "GET") {
    const [collections, escrow, drawdowns, invoices] = await Promise.all([
      query<any>(
        `SELECT buyer, unit_no, amount, days_due, stage, action
         FROM collections ORDER BY days_due DESC`
      ),
      query<any>(
        `SELECT id, reference, amount, bank, system AS system_side, received_at
         FROM escrow_ledger WHERE matched = false ORDER BY received_at DESC`
      ),
      query<any>(
        `SELECT ref, milestone, amount, cert, rera, status
         FROM drawdowns ORDER BY id DESC`
      ),
      query<any>(
        `SELECT no, buyer, unit_no, milestone, due, amount, paid
         FROM invoices ORDER BY due DESC`
      ),
    ]);

    return ok(res, {
      collections: collections.rows,
      escrow: {
        queue: escrow.rows,
        drawdowns: drawdowns.rows,
      },
      invoices: invoices.rows,
    });
  }

  if (req.method === "PUT") {
    if (!(await hasPerm(session, "Finance", "UPD"))) {
      return fail(res, "You don't have permission to perform this action.", 403);
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const action = String(body.action || "");

    if (action === "reconcile") {
      const miss = missingFields(body, ["id"]);
      if (miss) return fail(res, miss);
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid escrow ledger id", 400);
      const upd = await query<any>(
        `UPDATE escrow_ledger SET matched = true WHERE id = $1 RETURNING id`,
        [id]
      );
      if (upd.rows.length === 0) return notFound(res, "Escrow entry not found");
      return ok(res, { id: upd.rows[0].id, matched: true });
    }

    if (action === "drawdown") {
      const miss = missingFields(body, ["milestone", "amount"]);
      if (miss) return fail(res, miss);
      const milestone = String(body.milestone).trim();
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) return fail(res, "Enter a valid drawdown amount", 400);
      const rera = RERA_STATES.includes(String(body.rera)) ? String(body.rera) : "Submitted";

      const last = await query<any>(`SELECT MAX((substring(ref from 'DDR-([0-9]+)'))::int) AS mx FROM drawdowns`);
      const prev = Number(last.rows[0].mx) || 0;
      const ref = "DDR-" + (prev + 1).toString().padStart(4, "0");

      const cert = "WSP \u00b7 A. Faruqi \u00b7 " +
        new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

      const ins = await query<any>(
        `INSERT INTO drawdowns (ref, milestone, amount, cert, rera, status)
         VALUES ($1,$2,$3,$4,$5,'Awaiting trustee')
         RETURNING ref, milestone, amount, cert, rera, status`,
        [ref, milestone, amount, cert, rera]
      );
      return ok(res, ins.rows[0], 201);
    }

    return fail(res, "Unknown action: " + action, 400);
  }

  return methodNotAllowed(res);
});