import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm, hasPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed, missingFields, notFound } from "../../lib/api";

const ACTIONS = ["issue", "void", "bulk-issue"];

export default withPerm("Finance", "REA", async function (req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method === "GET") {
    const r = await query<any>(
      `SELECT id, no, buyer, unit_no, milestone, due, amount, paid, issued_at, voided_at, void_reason
       FROM invoices ORDER BY due DESC`
    );
    return ok(res, { invoices: r.rows });
  }

  if (req.method === "POST" || req.method === "PUT") {
    if (!(await hasPerm(session, "Finance", "UPD"))) {
      return fail(res, "You don't have permission to perform this action.", 403);
    }
    const body = (req.body || {}) as Record<string, unknown>;
    const action = String(body.action || "");

    if (action === "issue") {
      const miss = missingFields(body, ["id"]);
      if (miss) return fail(res, miss);
      const id = Number(body.id ?? req.query.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid invoice id", 400);
      const upd = await query<any>(
        `UPDATE invoices SET issued_at = now()::date WHERE id = $1 AND voided_at IS NULL RETURNING id, no`,
        [id]
      );
      if (upd.rows.length === 0) return notFound(res, "Invoice not found or already voided");
      return ok(res, upd.rows[0]);
    }

    if (action === "void") {
      const miss = missingFields(body, ["id", "reason"]);
      if (miss) return fail(res, miss);
      const id = Number(body.id ?? req.query.id);
      if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid invoice id", 400);
      const reason = String(body.reason).trim().slice(0, 160);
      if (!reason) return fail(res, "A void reason is required", 400);

      const row = await query<any>(`SELECT id, paid FROM invoices WHERE id = $1`, [id]);
      if (row.rows.length === 0) return notFound(res, "Invoice not found");
      if (row.rows[0].paid) return fail(res, "Cannot void a paid invoice", 400);

      const upd = await query<any>(
        `UPDATE invoices SET voided_at = now()::date, void_reason = $2 WHERE id = $1 RETURNING id, no, void_reason`,
        [id, reason]
      );
      return ok(res, upd.rows[0]);
    }

    if (action === "bulk-issue") {
      const upd = await query<any>(
        `UPDATE invoices SET issued_at = now()::date WHERE issued_at IS NULL AND voided_at IS NULL RETURNING id, no`
      );
      return ok(res, { issued: upd.rows.length, rows: upd.rows });
    }

    return fail(res, "Unknown action: " + action + " (expected: " + ACTIONS.join(", ") + ")", 400);
  }

  return methodNotAllowed(res);
});