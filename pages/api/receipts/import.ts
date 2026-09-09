import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../../lib/permissions";
import { query } from "../../../lib/db";
import { ok, fail, methodNotAllowed } from "../../../lib/api";

type StmtRow = { value_date: string; reference: string; amount: number; description: string };

function parseAmount(v: string): number {
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseDate(v: string): string | null {
  const m = String(v).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function parseCsv(csv: string): StmtRow[] {
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  const isHeader = /^(date|received|value|transaction|desc)/i.test(lines[0].split(",")[0].trim());
  const out: StmtRow[] = [];
  for (const line of isHeader ? lines.slice(1) : lines) {
    const parts = line.split(",");
    if (parts.length < 3) continue;
    const amount = parseAmount(parts[2]);
    if (!(amount > 0)) continue;
    out.push({
      value_date: parseDate(parts[0]) || parts[0].trim(),
      reference: parts[1].trim(),
      amount,
      description: parts.slice(3).join(",").trim(),
    });
  }
  return out;
}

async function autoMatch(stmtId: number, reference: string, amount: number): Promise<boolean> {
  const hits = await query<any>(
    `SELECT r.id, r.reference FROM receipts r
     WHERE r.amount = $1
     ORDER BY (CASE WHEN lower(COALESCE(r.reference,'')) = lower($2) THEN 0 ELSE 1 END), r.id DESC
     LIMIT 2`,
    [amount, reference]
  );
  if (!hits.rows.length) return false;
  const pick = hits.rows.length === 1 ? hits.rows[0] : hits.rows.find((r: any) => String(r.reference).length > 0);
  if (!pick) return false;
  await query<any>(
    `UPDATE bank_statements SET matched = true, matched_receipt_id = $1 WHERE id = $2`,
    [pick.id, stmtId]
  );
  return true;
}

export default withPerm("Finance", "UPD", async function (req: NextApiRequest, res: NextApiResponse, session: any) {
  if (req.method === "GET") {
    const rows = await query<any>(
      `SELECT s.id, s.value_date, s.reference, s.amount, s.description, s.matched,
              r.id AS receipt_id
       FROM bank_statements s
       LEFT JOIN receipts r ON r.id = s.matched_receipt_id
       ORDER BY s.value_date DESC, s.id DESC`
    );
    return ok(res, {
      statements: rows.rows.map((s: any) => ({
        id: s.id,
        date: s.value_date ? new Date(s.value_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }) : "",
        reference: s.reference || "",
        amount: Number(s.amount) || 0,
        description: s.description || "",
        matched: !!s.matched,
        receiptId: s.receipt_id || null,
      })),
    });
  }

  if (req.method === "POST") {
    const { csv, statements } = req.body || {};
    let rows: StmtRow[] = [];
    if (Array.isArray(statements)) {
      rows = statements.map((s: any) => ({
        value_date: parseDate(String(s.date || "")) || "",
        reference: String(s.reference || ""),
        amount: Number(s.amount) || 0,
        description: String(s.description || ""),
      })).filter((s: StmtRow) => s.amount > 0);
    } else if (typeof csv === "string" && csv.trim()) {
      rows = parseCsv(csv);
    }
    if (!rows.length) return fail(res, "No valid statement rows (expected date,reference,amount,description)");

    let inserted = 0;
    let matched = 0;
    const queue: any[] = [];
    for (const r of rows) {
      const dup = await query<any>(
        `SELECT id FROM bank_statements WHERE lower(COALESCE(reference,'')) = lower($1) AND amount = $2 LIMIT 1`,
        [r.reference, r.amount]
      );
      if (dup.rows.length) continue;
      const ins = await query<any>(
        `INSERT INTO bank_statements (value_date, reference, amount, description)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [r.value_date || null, r.reference, r.amount, r.description]
      );
      inserted++;
      const hit = await autoMatch(ins.rows[0].id, r.reference, r.amount);
      if (hit) matched++;
      queue.push({ id: ins.rows[0].id, date: r.value_date || "", reference: r.reference, amount: r.amount, description: r.description });
    }
    await query(
      `INSERT INTO audit_log (actor, role, action, object, field, before_val, after_val)
       VALUES ($1,$2,'Imported','Bank statement', $3, '', $4)`,
      [
        session.full_name || session.email || "user",
        session.role,
        inserted + " rows",
        matched + " auto-matched",
      ]
    );
    return ok(res, { imported: inserted, matched, queue }, 201);
  }

  if (req.method === "PUT") {
    const id = Number(req.query.id);
    if (!id) return fail(res, "Statement id is required");
    const action = req.body?.action;

    if (action === "confirm") {
      const row = await query<any>("SELECT * FROM bank_statements WHERE id = $1", [id]);
      if (!row.rows.length) return fail(res, "Statement not found", 404);
      const receiptId = Number(req.body?.receipt) || null;
      if (receiptId) {
        await query<any>(
          `UPDATE bank_statements SET matched = true, matched_receipt_id = $1 WHERE id = $2`,
          [receiptId, id]
        );
      } else {
        await autoMatch(id, row.rows[0].reference, Number(row.rows[0].amount) || 0);
      }
      return ok(res, { id, action: "confirmed" });
    }

    if (action === "reject") {
      const del = await query<any>("DELETE FROM bank_statements WHERE id = $1 RETURNING id", [id]);
      if (!del.rows.length) return fail(res, "Statement not found", 404);
      return ok(res, { id, action: "rejected" });
    }

    return fail(res, "Unknown action — expected confirm / reject");
  }

  return methodNotAllowed(res);
});