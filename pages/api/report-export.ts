import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";

type K = { col: string; label?: string; fn?: (v: any) => string };
const COLS: Record<string, K[]> = {
  "Sales register": [
    { col: "code", label: "Project" }, { col: "name", label: "Unit" }, { col: "type" },
    { col: "status" }, { col: "price", fn: (v) => Number(v).toLocaleString("en-US") }, { col: "buyer", label: "Buyer" },
  ],
  "Inventory status": [
    { col: "code", label: "Project" }, { col: "status" }, { col: "n", label: "Units", fn: (v) => String(v) },
  ],
  "Price list": [
    { col: "code", label: "Project" }, { col: "no", label: "Unit" }, { col: "type" },
    { col: "area" }, { col: "price", fn: (v) => Number(v).toLocaleString("en-US") },
  ],
  "Collections summary": [
    { col: "buyer" }, { col: "unit_no", label: "Unit" }, { col: "stage" },
    { col: "days_due", label: "Days", fn: (v) => String(v) }, { col: "amount", fn: (v) => Number(v).toLocaleString("en-US") }, { col: "action" },
  ],
  "Ageing analysis": [
    { col: "buyer" }, { col: "unit_no", label: "Unit" }, { col: "stage" },
    { col: "days_due", label: "Days", fn: (v) => String(v) }, { col: "amount", fn: (v) => Number(v).toLocaleString("en-US") },
  ],
  "Receipts register": [
    { col: "reference", label: "Ref" }, { col: "name", label: "Buyer" }, { col: "method" },
    { col: "received_at", label: "Date", fn: (v) => new Date(v).toLocaleDateString("en-GB") },
    { col: "amount", fn: (v) => Number(v).toLocaleString("en-US") }, { col: "matched" },
  ],
  "Cashflow forecast": [
    { col: "unit", label: "Unit" }, { col: "milestone" }, { col: "due_date", label: "Due", fn: (v) => new Date(v).toLocaleDateString("en-GB") },
    { col: "amount", fn: (v) => Number(v).toLocaleString("en-US") }, { col: "status" },
  ],
  "Escrow reconciliation": [
    { col: "reference", label: "Ref" }, { col: "direction" }, { col: "received_at", label: "Date", fn: (v) => new Date(v).toLocaleDateString("en-GB") },
    { col: "amount", fn: (v) => Number(v).toLocaleString("en-US") }, { col: "bank" }, { col: "system", label: "System" }, { col: "matched" },
  ],
  "Invoice register": [
    { col: "no", label: "Invoice" }, { col: "buyer" }, { col: "unit_no", label: "Unit" },
    { col: "milestone" }, { col: "due", label: "Due", fn: (v) => new Date(v).toLocaleDateString("en-GB") },
    { col: "amount", fn: (v) => Number(v).toLocaleString("en-US") }, { col: "paid" },
  ],
};

const SQL: Record<string, string> = {
  "Sales register": `SELECT p.code, u.no AS name, u.type, u.status, u.price, b.name AS buyer
     FROM units u JOIN projects p ON p.id = u.project_id LEFT JOIN buyers b ON b.id = u.buyer_id
     WHERE u.status = 'sold' ORDER BY p.code, u.no LIMIT 500`,
  "Inventory status": `SELECT p.code, u.status, COUNT(*) AS n FROM units u JOIN projects p ON p.id = u.project_id GROUP BY p.code, u.status ORDER BY p.code, u.status LIMIT 500`,
  "Price list": `SELECT p.code, u.no, u.type, u.area, u.price FROM units u JOIN projects p ON p.id = u.project_id WHERE u.price > 0 ORDER BY p.code, u.no LIMIT 500`,
  "Collections summary": `SELECT buyer, unit_no, stage, days_due, amount, action FROM collections ORDER BY days_due DESC LIMIT 500`,
  "Ageing analysis": `SELECT buyer, unit_no, stage, days_due, amount FROM collections ORDER BY days_due DESC LIMIT 500`,
  "Receipts register": `SELECT r.reference, b.name, r.method, r.received_at, r.amount, r.matched FROM receipts r LEFT JOIN buyers b ON b.id = r.buyer_id ORDER BY r.received_at DESC LIMIT 500`,
  "Cashflow forecast": `SELECT u.no AS unit, m.milestone, m.due_date, m.amount, m.status FROM payment_milestones m LEFT JOIN units u ON u.id = m.unit_id WHERE m.status <> 'paid' ORDER BY m.due_date LIMIT 500`,
  "Escrow reconciliation": `SELECT reference, direction, received_at, amount, bank, system, matched FROM escrow_ledger ORDER BY received_at DESC LIMIT 500`,
  "Invoice register": `SELECT no, buyer, unit_no, milestone, due, amount, paid FROM invoices ORDER BY due DESC LIMIT 500`,
};

const FALLBACK: Record<string, { sql: string; label: string }> = {
  "Sales velocity": { sql: `SELECT COUNT(*)::int AS n FROM units`, label: "Units on record" },
  "Agent performance": { sql: `SELECT COUNT(*)::int AS n FROM leads WHERE agent IS NOT NULL`, label: "Leads with agent" },
  "Broker performance": { sql: `SELECT COUNT(*)::int AS n FROM leads WHERE agent IS NOT NULL AND source ILIKE '%broker%'`, label: "Broker-sourced leads" },
  "Lead source ROI": { sql: `SELECT source, COUNT(*)::int AS n FROM leads GROUP BY source ORDER BY n DESC`, label: "Leads by source" },
  "Commission payable": { sql: `SELECT COUNT(*)::int AS n FROM units WHERE status = 'sold'`, label: "Sold units" },
  "Oqood registration status": { sql: `SELECT COUNT(*)::int AS n FROM pipeline_items WHERE stage = 'title_deed_issued'`, label: "Deeds issued" },
  "KYC completeness": { sql: `SELECT kyc_status, COUNT(*)::int AS n FROM buyers GROUP BY kyc_status`, label: "Buyers by KYC status" },
  "Construction progress": { sql: `SELECT status, COUNT(*)::int AS n FROM projects GROUP BY status`, label: "Projects by status" },
  "Milestone variance": { sql: `SELECT COUNT(*)::int AS n FROM payment_milestones WHERE status = 'due'`, label: "Due milestones" },
  "Handover readiness": { sql: `SELECT COUNT(*)::int AS n FROM pipeline_items`, label: "Pipeline items" },
  "Snagging summary": { sql: `SELECT severity, COUNT(*)::int AS n FROM snag_items GROUP BY severity`, label: "Snag items by severity" },
};

const esc = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};

export default withPerm("Finance", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  const name = String(req.query.report || "").trim();
  let rows: Record<string, any>[];
  let cols: K[];
  const sql = SQL[name];
  const fb = FALLBACK[name];
  if (sql) {
    cols = COLS[name];
    rows = (await query<any>(sql)).rows;
  } else if (fb) {
    cols = [{ col: fb.label }];
    rows = (await query<any>(fb.sql)).rows;
  } else {
    res.status(404).json({ ok: false, error: "Unknown report: " + name });
    return;
  }

  const head = cols.map((c) => esc(c.label || c.col)).join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => esc(c.fn ? c.fn(r[c.col]) : r[c.col]))
        .join(",")
    )
    .join("\n");

  res.setHeader("Content-Type", "text/csv;charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="ellington-' + name.replace(/\s+/g, "-").toLowerCase() + '.csv"');
  res.status(200).send("\uFEFF" + head + "\n" + body + "\n");
});