import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed, missingFields, notFound } from "../../lib/api";

const RERA_STATES = ["Draft", "Submitted", "Approved"];

export default withPerm("Finance", "REA", async function (req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method === "GET") {
    const [collections, escrow, drawdowns, invoices] = await Promise.all([
      query<any>(
        `SELECT id, buyer, unit_no, amount, days_due, stage, action,
                last_contact, promised_date, promised_amount
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
        `SELECT id, no, buyer, unit_no, milestone, due, amount, paid, issued_at, voided_at, void_reason
         FROM invoices ORDER BY due DESC`
      ),
    ]);

    const unit = String(req.query.unit || "") || undefined;
    let defaultCalc: Record<string, unknown> | null = null;
    if (unit) {
      defaultCalc = await calcDefault(unit);
    }

    return ok(res, {
      collections: collections.rows,
      escrow: {
        queue: escrow.rows,
        drawdowns: drawdowns.rows,
      },
      invoices: invoices.rows,
      defaultCalc,
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

    if (action === "remind") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid collection id", 400);
      const upd = await query<any>(
        `UPDATE collections SET last_contact = now()::date WHERE id = $1 RETURNING id, buyer, stage`,
        [id]
      );
      if (upd.rows.length === 0) return notFound(res, "Collection row not found");
      await audit(session, "Finance", "Updated", "Collections \u00b7 " + upd.rows[0].buyer, "Last contact", "", "Reminder sent");
      return ok(res, upd.rows[0]);
    }

    if (action === "log") {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid collection id", 400);
      const upd = await query<any>(
        `UPDATE collections SET last_contact = now()::date WHERE id = $1 RETURNING id, buyer`,
        [id]
      );
      if (upd.rows.length === 0) return notFound(res, "Collection row not found");
      await audit(session, "Finance", "Updated", "Collections \u00b7 " + upd.rows[0].buyer, "Last contact", "", "Call logged");
      return ok(res, upd.rows[0]);
    }

    if (action === "promise") {
      const miss = missingFields(body, ["id", "date"]);
      if (miss) return fail(res, miss);
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid collection id", 400);
      const promised = String(body.date).trim();
      const pDate = new Date(promised);
      if (isNaN(pDate.getTime())) return fail(res, "A valid promised date is required", 400);
      const pAmount = body.amount != null ? Math.max(0, Number(body.amount)) : null;
      const upd = await query<any>(
        `UPDATE collections SET promised_date = $2, promised_amount = COALESCE($3, amount) WHERE id = $1 RETURNING id, buyer, promised_date, promised_amount`,
        [id, promised, pAmount]
      );
      if (upd.rows.length === 0) return notFound(res, "Collection row not found");
      await audit(session, "Finance", "Updated", "Collections \u00b7 " + upd.rows[0].buyer, "Promise to pay", "", promised);
      return ok(res, upd.rows[0]);
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

async function calcDefault(unitNo: string) {
  const u = await query<any>(
    `SELECT u.id, u.no, u.price, u.project_id, p.code AS project
     FROM units u JOIN projects p ON p.id = u.project_id
     WHERE upper(u.no) = upper($1)`,
    [unitNo]
  );
  if (!u.rows.length) return null;

  const unit = u.rows[0];
  const contract = Number(unit.price) || 0;

  const paidRes = await query<any>(
    `SELECT COALESCE(SUM(amount),0) AS paid FROM receipts WHERE unit_id = $1`,
    [unit.id]
  );
  const paid = Number(paidRes.rows[0].paid) || 0;

  const constr = await query<any>(
    `SELECT COALESCE(SUM(actual_pct * weight) / NULLIF(SUM(weight),0), 0) AS overall
     FROM construction_milestones WHERE project_id = $1`,
    [unit.project_id]
  );
  const overall = Number(constr.rows[0].overall) || 0;

  let retentionPct = 0;
  if (overall < 60) retentionPct = 25;
  else if (overall <= 80) retentionPct = 40;
  else retentionPct = 0;

  const retentionAmount = contract * (retentionPct / 100);
  const refund = Math.max(0, paid - retentionAmount);

  return {
    unit: unit.no,
    project: unit.project,
    contract,
    paid,
    constructionPct: Math.round(overall * 10) / 10,
    tier: overall < 60 ? "Construction < 60%" : overall <= 80 ? "Construction 60-80%" : "Construction > 80%",
    retentionPct,
    retentionAmount,
    refund,
  };
}

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