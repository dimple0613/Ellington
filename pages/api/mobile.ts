import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, methodNotAllowed } from "../../lib/api";

export default withPerm("Dashboard", "REA", async function (req: NextApiRequest, res: NextApiResponse, session) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const [proj, receipts, coll, mixes, topMiles, draw, ageing, topBuyer] = await Promise.all([
    query<any>(
      `SELECT p.code, p.name, p.gdv, p.collected,
              COUNT(u.id)::int AS total_u,
              COALESCE(SUM(u.price) FILTER (WHERE u.status IN ('sold','booked')),0)::numeric AS sold_v,
              COUNT(u.id) FILTER (WHERE u.status = 'available') AS available,
              COUNT(u.id) FILTER (WHERE u.status = 'booked') AS booked,
              COUNT(u.id) FILTER (WHERE u.status = 'reserved') AS reserved,
              COUNT(u.id) FILTER (WHERE u.status = 'held') AS held,
              COUNT(u.id) FILTER (WHERE u.status = 'blocked') AS blocked,
              COUNT(u.id) FILTER (WHERE u.status = 'sold') AS sold_u
       FROM projects p LEFT JOIN units u ON u.project_id = p.id
       WHERE lower(p.name) NOT LIKE '%test%'
       GROUP BY p.id ORDER BY p.code`
    ),
    query<any>(`SELECT method, COALESCE(SUM(amount),0)::numeric AS total, COUNT(*)::int AS n FROM receipts GROUP BY method`),
    query<any>(`SELECT COALESCE(SUM(amount),0)::numeric AS total, COUNT(*)::int AS n FROM collections`),
    query<any>(
      `SELECT p.code, u.type, COUNT(*)::int AS n,
              COUNT(*) FILTER (WHERE u.status = 'sold')::int AS sold
       FROM units u JOIN projects p ON p.id = u.project_id
       GROUP BY p.code, u.type ORDER BY p.code, u.type`
    ),
    query<any>(
      `SELECT p.code, m.milestone, m.due_date, m.amount
       FROM payment_milestones m
       JOIN units u ON u.id = m.unit_id
       JOIN projects p ON p.id = u.project_id
       WHERE m.status <> 'paid' AND m.due_date >= CURRENT_DATE
       ORDER BY m.due_date LIMIT 3`
    ),
    query<any>(`SELECT COALESCE(SUM(amount),0)::numeric AS total, COUNT(*)::int AS n FROM drawdowns WHERE status <> 'Released'`),
    query<any>(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE days_due < 1),0)::numeric AS current,
              COALESCE(SUM(amount) FILTER (WHERE days_due BETWEEN 1 AND 30),0)::numeric AS b30,
              COALESCE(SUM(amount) FILTER (WHERE days_due BETWEEN 31 AND 60),0)::numeric AS b60,
              COALESCE(SUM(amount) FILTER (WHERE days_due BETWEEN 61 AND 90),0)::numeric AS b90,
              COALESCE(SUM(amount) FILTER (WHERE days_due > 90),0)::numeric AS b90p
       FROM collections`
    ),
    query<any>(`SELECT buyer, unit_no, amount, days_due FROM collections ORDER BY days_due DESC LIMIT 1`),
  ]);

  const pRows = proj.rows as {
    code: string; name: string; gdv: number; collected: number;
    total_u: number; sold_v: number;
    available: number; booked: number; reserved: number; held: number; blocked: number; sold_u: number;
  }[];
  const totalGdv = pRows.reduce((a, p) => a + Number(p.gdv), 0);
  const totalCollected = pRows.reduce((a, p) => a + Number(p.collected), 0);
  const target = Math.round(totalGdv * 0.9);
  const forecast30 = topMiles.rows.reduce((a: number, m: { amount: number }) => a + Number(m.amount), 0);

  const collTotal = Number(coll.rows[0]?.total || 0);
  const maxDue = Number(coll.rows[0]?.max_due || 0);
  const cheques = receipts.rows.find((r) => r.method === "cheque")?.n || 0;

  const byCode = (code: string) =>
    mixes.rows.filter((m) => m.code === code).map((m) => ({
      type: m.type || "2BR",
      count: Number(m.n) || 0,
      sold: Number(m.sold) || 0,
    }));

  const projects = pRows.map((p) => ({
    code: p.code,
    name: p.name,
    total: Number(p.total_u) || 0,
    gdv: Number(p.gdv),
    sold: Number(p.sold_v) || 0,
    collected: Number(p.collected),
    counts: {
      available: Number(p.available) || 0,
      booked: Number(p.booked) || 0,
      reserved: Number(p.reserved) || 0,
      held: Number(p.held) || 0,
      blocked: Number(p.blocked) || 0,
      sold: Number(p.sold_u) || 0,
    },
    mix: byCode(p.code),
  }));

  const aRows = ageing.rows[0] || { current: 0, b30: 0, b60: 0, b90: 0, b90p: 0 };
  const buckets = [
    { bucket: "Current", amt: Number(aRows.current) },
    { bucket: "1–30 days", amt: Number(aRows.b30) },
    { bucket: "31–60 days", amt: Number(aRows.b60) },
    { bucket: "61–90 days", amt: Number(aRows.b90) },
    { bucket: "90+ days", amt: Number(aRows.b90p) },
  ];
  const ageingTotal = buckets.reduce((a, b) => a + b.amt, 0) || 1;

  const bankTotal = receipts.rows.find((r) => r.method === "bank_transfer")?.total || 0;
  const receiptsTotal = receipts.rows.reduce((a, r) => a + Number(r.total), 0) || 1;
  const instalmentPct = Math.round((Number(bankTotal) / receiptsTotal) * 100);

  ok(res, {
    me: { name: session.full_name || session.email || "Executive", role: session.role || "" },
    portfolio: {
      value: totalGdv,
      collected: totalCollected,
      target,
      overdue: collTotal,
      cheques,
      max_due: maxDue,
      confidence: { amount: forecast30, pct: 87 },
    },
    projects,
    money: {
      ytd: totalCollected,
      target,
      instalments: instalmentPct,
      forecast30,
      milestones: topMiles.rows.map((m) => ({
        project: m.code || "",
        milestone: m.milestone || "",
        amount: Number(m.amount) || 0,
        due: m.due_date ? String(m.due_date).slice(0, 10) : "",
      })),
      ageing: buckets.map((b) => ({
        bucket: b.bucket,
        amount: b.amt,
        pct: Math.round((b.amt / ageingTotal) * 100),
      })),
      buyer: topBuyer.rows[0]
        ? {
            name: topBuyer.rows[0].buyer || "",
            unit: topBuyer.rows[0].unit_no || "",
            amount: Number(topBuyer.rows[0].amount) || 0,
            days: Number(topBuyer.rows[0].days_due) || 0,
          }
        : null,
    },
    approvals: {
      count: Number(draw.rows[0]?.n || 0),
      valueM: ((Number(draw.rows[0]?.total || 0)) / 1e6).toFixed(1),
    },
  });
});