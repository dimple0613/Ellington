import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok } from "../../lib/api";

const AED = (n: unknown) => Number(n);

export default withPerm("Finance", "REA", async function (_req: NextApiRequest, res: NextApiResponse) {
  const [openBal, expected30, expectedAll, ddrTotal, refunds, byDay, weekly, monthly90, monthly180, pendingDdr] = await Promise.all([
    query<{ s: string | number }>(
      `SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0)::text AS s FROM escrow_ledger`
    ),
    query<{ s: string | number }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS s FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '30 days'`
    ),
    query<{ s: string | number }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS s FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '180 days'`
    ),
    query<{ s: string | number }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS s FROM drawdowns WHERE status <> 'Draft'`
    ),
    query<{ s: string | number }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS s FROM escrow_ledger WHERE direction = 'out'`
    ),
    query<{ d: string; s: string | number }>(
      `SELECT to_char(due_date, 'Dy') AS d, COALESCE(SUM(amount), 0)::text AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + 7
       GROUP BY due_date ORDER BY due_date`
    ),
    query<{ w: number; s: string | number }>(
      `SELECT ((due_date - CURRENT_DATE) / 7 + 1)::int AS w, COALESCE(SUM(amount), 0)::text AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '30 days'
       GROUP BY w ORDER BY w`
    ),
    query<{ m: string; s: string | number }>(
      `SELECT to_char(due_date, 'Mon YY') AS m, COALESCE(SUM(amount), 0)::text AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '90 days'
       GROUP BY m ORDER BY MIN(due_date)`
    ),
    query<{ m: string; s: string | number }>(
      `SELECT to_char(due_date, 'Mon YY') AS m, COALESCE(SUM(amount), 0)::text AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '180 days'
       GROUP BY m ORDER BY MIN(due_date)`
    ),
    query<{ s: string | number }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS s FROM drawdowns WHERE status = 'Awaiting trustee'`
    ),
  ]);

  const open = AED(openBal.rows[0]?.s || 0);
  const exp30 = AED(expected30.rows[0]?.s || 0);
  const exp180 = AED(expectedAll.rows[0]?.s || 0);
  const ddrs = AED(ddrTotal.rows[0]?.s || 0);
  const refund = AED(refunds.rows[0]?.s || 0);
  const pending = AED(pendingDdr.rows[0]?.s || 0);

  const M = (n: number) => n / 1e6;

  const buckets: Record<string, [string, number][]> = {
    "7": [["Mon", 0], ["Tue", 0], ["Wed", 0], ["Thu", 0], ["Fri", 0], ["Sat", 0], ["Sun", 0]],
    "30": [["W1", 0], ["W2", 0], ["W3", 0], ["W4", 0]],
    "90": [],
    "180": [],
  };
  const DAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  for (const r of byDay.rows) {
    const s = AED(r.s);
    const i = DAY[r.d] ?? -1;
    if (i >= 0) buckets["7"][i] = [r.d, M(s)];
  }
  for (const r of weekly.rows) {
    const w = Math.min(Math.max(r.w, 1), 4);
    buckets["30"][w - 1] = ["W" + w, M(AED(r.s))];
  }
  for (const r of monthly90.rows) buckets["90"].push([r.m, M(AED(r.s))]);
  for (const r of monthly180.rows) buckets["180"].push([r.m, M(AED(r.s))]);

  const confidence = exp30 * 0.086;
  const ladder: [string, number, number][] = [
    ["Opening escrow balance", M(open), 0],
    ["Expected collections", M(exp30), 1],
    ["Confidence adjustment", M(-confidence), 2],
    ["Drawdown requests approved", M(-ddrs), 2],
    ["Refunds and cancellations", M(-refund), 2],
    ["Projected closing balance", M(open + exp30 - confidence - ddrs - refund), 0],
  ];

  const rows = await query<{ m: string; s: string | number }>(
    `SELECT to_char(due_date, 'Mon YY') AS m, COALESCE(SUM(amount), 0)::text AS s
     FROM payment_milestones WHERE status <> 'paid' AND due_date >= date_trunc('month', CURRENT_DATE + interval '1 month')
       AND due_date < date_trunc('month', CURRENT_DATE + interval '1 month') + interval '6 months'
     GROUP BY m ORDER BY MIN(due_date)`
  );
  const monthlyDraw = pending / Math.max(rows.rows.length, 1);
  const monthly: [string, number, number, number, number][] = [];
  let running = open + exp30 - confidence - ddrs - refund;
  for (const r of rows.rows) {
    const inflow = AED(r.s);
    running = running + inflow - monthlyDraw;
    monthly.push([r.m, M(inflow), M(monthlyDraw), M(inflow - monthlyDraw), M(running)]);
  }

  const triggers = await query<{ h: number; s: string | number }>(
    `SELECT
        CASE
          WHEN milestone ILIKE '%handover%' OR milestone ILIKE '%final%' THEN 2
          WHEN milestone ILIKE ANY(ARRAY['%structure%','%excavation%','%enabling%','%foundation%','%finishing%','%roof%','%facade%']) THEN 1
          ELSE 0
        END AS h,
        COALESCE(SUM(amount), 0)::text AS s
     FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + interval '90 days'
     GROUP BY h`
  );
  const TOTALS = ["Date-driven instalments", "Construction-milestone", "Handover payments"];
  const trigSum = triggers.rows.reduce((a, t) => a + AED(t.s), 0) || 1;
  const idx: Record<number, number> = {};
  for (const t of triggers.rows) idx[t.h] = AED(t.s);
  const split: [string, number, string][] = [
    [TOTALS[0], (idx[0] || 0) / trigSum * 100, "#4F46F5"],
    [TOTALS[1], (idx[1] || 0) / trigSum * 100, "#8B7CF6"],
    [TOTALS[2], (idx[2] || 0) / trigSum * 100, "#B9B4FA"],
  ];

  ok(res, { cashflow: { buckets, window: { d30: M(exp30), d180: M(exp180) }, ladder, split, rows: monthly } });
});