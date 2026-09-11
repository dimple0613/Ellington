import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok } from "../../lib/api";
import { compact } from "../../lib/format";

type Row = { s?: string | number; n?: string | number };

const Q = (n: unknown) => Number(n) || 0;
const rnd = (n: number, d = 1) => Math.round(n * Math.pow(10, d)) / Math.pow(10, d);

function spark(vals: number[], pts = 6): string {
  if (!vals.length) return "0,9 6,9 12,9 18,9 24,9 30,9";
  const mx = Math.max(...vals) || 1;
  const len = vals.length;
  const out: string[] = [];
  for (let i = 0; i < pts; i++) {
    const idx = Math.min(len - 1, Math.round((i / (pts - 1)) * (len - 1)));
    const v = vals[idx] / mx;
    const x = i * 6;
    const y = rnd(2 + (1 - v) * 13, 1);
    out.push(x + "," + y);
  }
  return out.join(" ");
}

export default withPerm("Dashboard", "REA", async function (_req: NextApiRequest, res: NextApiResponse) {
  const [
    projectsRes,
    unitsRes,
    soldCountsRes,
    receiptsTot,
    escrowRes,
    agingRes,
    bookingWeeks,
    attentionRes,
    fc7,
    fc30,
    fc90,
    fc180,
  ] = await Promise.all([
    query<any>(`SELECT id, code, name, location, status, units_total, gdv, sold, collected, due_date FROM projects WHERE lower(name) NOT LIKE '%test%' ORDER BY code`),
    query<any>(
      `SELECT
         (SELECT COALESCE(SUM(units_total),0) FROM projects WHERE lower(name) NOT LIKE '%test%')::float AS total,
         (SELECT COUNT(*)::float FROM units)::float AS live,
         (SELECT COUNT(*)::float FROM units WHERE status='available')::float AS avail,
         (SELECT COALESCE(SUM(price),0) FROM units WHERE status='available')::float AS inv_val,
         (SELECT COUNT(*)::float FROM buyers)::float AS buyers
       FROM projects LIMIT 1`
    ),
    query<any>(
      `SELECT p.code, COUNT(u.id)::int AS n
       FROM projects p LEFT JOIN units u ON u.project_id = p.id AND u.status IN ('sold','booked')
       WHERE lower(p.name) NOT LIKE '%test%'
       GROUP BY p.code`
    ),
    query<any>(
      `SELECT COUNT(*)::float AS n, COALESCE(SUM(amount),0)::float AS s FROM receipts WHERE (pdc_status IS NULL OR pdc_status <> 'Bounced')`
    ),
    query<any>(
      `SELECT COALESCE(SUM(CASE WHEN direction='in' THEN amount ELSE -amount END),0)::float AS bal,
              (SELECT COUNT(*)::float FROM escrow_ledger WHERE matched=false AND "bank"=true)::float AS unmatched
       FROM escrow_ledger`
    ),
    query<any>(
      `SELECT
         COALESCE(SUM(CASE WHEN days_due BETWEEN 0 AND 0 THEN amount END),0)::float AS c0,
         COALESCE(SUM(CASE WHEN days_due BETWEEN 1 AND 30 THEN amount END),0)::float AS c30,
         COALESCE(SUM(CASE WHEN days_due BETWEEN 31 AND 60 THEN amount END),0)::float AS c60,
         COALESCE(SUM(CASE WHEN days_due BETWEEN 61 AND 90 THEN amount END),0)::float AS c90,
         COALESCE(SUM(CASE WHEN days_due>90 THEN amount END),0)::float AS c90p,
         COALESCE(COUNT(CASE WHEN days_due BETWEEN 1 AND 30 THEN 1 END),0)::float AS n30,
         COALESCE(COUNT(CASE WHEN days_due BETWEEN 31 AND 60 THEN 1 END),0)::float AS n60,
         COALESCE(COUNT(CASE WHEN days_due BETWEEN 61 AND 90 THEN 1 END),0)::float AS n90,
         COALESCE(COUNT(CASE WHEN days_due>90 THEN 1 END),0)::float AS n90p,
         COALESCE(SUM(amount),0)::float AS overdue_total,
         COALESCE(COUNT(*),0)::float AS overdue_count
       FROM collections`
    ),
    query<any>(
      `SELECT EXTRACT(week FROM confirmed_at)::int AS w, COUNT(*)::float AS n
       FROM bookings WHERE status='confirmed' AND confirmed_at > now() - interval '84 days'
       GROUP BY EXTRACT(week FROM confirmed_at) ORDER BY w`
    ),
    query<any>(
      `SELECT 'overdue90' AS k, COUNT(*)::float AS n, COALESCE(SUM(amount),0)::float AS s
       FROM collections WHERE days_due>90
       UNION ALL SELECT 'escrow', COUNT(*)::float, 0 FROM escrow_ledger WHERE matched=false AND "bank"=true
       UNION ALL SELECT 'approvals', COUNT(*)::float, 0 FROM bookings WHERE status='pending_approval'
       UNION ALL SELECT 'deeds', COUNT(*)::float, 0 FROM deeds WHERE deed='Applied' OR oa='Pending'
       UNION ALL SELECT 'negotiation', COUNT(*)::float, 0 FROM leads WHERE stage='negotiation'`
    ),
    query<Row>(
      `SELECT to_char(due_date, 'Dy') AS d, COALESCE(SUM(amount),0)::float AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + 7
       GROUP BY due_date ORDER BY due_date`
    ),
    query<Row>(
      `SELECT ((due_date - CURRENT_DATE)/7 + 1)::int AS w, COALESCE(SUM(amount),0)::float AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + 30
       GROUP BY w ORDER BY w`
    ),
    query<Row>(
      `SELECT to_char(due_date, 'Mon YY') AS m, COALESCE(SUM(amount),0)::float AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + 90
       GROUP BY m ORDER BY MIN(due_date)`
    ),
    query<Row>(
      `SELECT to_char(due_date, 'Mon YY') AS m, COALESCE(SUM(amount),0)::float AS s
       FROM payment_milestones WHERE status <> 'paid' AND due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + 180
       GROUP BY m ORDER BY MIN(due_date)`
    ),
  ]);

  // ── projects ──────────────────────────────────────────────────────────
  const countByCode: Record<string, number> = {};
  for (const row of soldCountsRes.rows) countByCode[row.code] = row.n;

  const projects = projectsRes.rows.map((p) => {
    const sold = countByCode[p.code] || 0;
    const soldV = Q(p.sold);
    const coll = soldV > 0 ? Math.round((Q(p.collected) / soldV) * 100) : 0;
    const cons = Q(p.gdv) > 0 ? Math.round((Q(p.collected) / Q(p.gdv)) * 100) : 0;
    const statusMap: Record<string, string> = {
      launched: "Launched",
      under_construction: "Under construction",
      handover: "In handover",
    };
    return {
      code: p.code,
      name: p.name,
      loc: p.location || "",
      units: Q(p.units_total),
      sold,
      gdv: Q(p.gdv),
      soldV,
      coll,
      cons,
      status: statusMap[p.status] || p.status || "",
      flag: false,
    };
  });

  // ── totals ────────────────────────────────────────────────────────────
  const gdv = projects.reduce((a, b) => a + b.gdv, 0);
  const soldV = projects.reduce((a, b) => a + b.soldV, 0);
  const collected = projects.reduce((a, b) => a + (b.soldV * (b.coll / 100)), 0);
  const outstanding = Math.max(0, soldV - collected);
  const un = unitsRes.rows[0] || {} as any;
  const totalUnits = Math.round(Number(un.total) || Number(un.live) || 0);
  const availUnits = Math.round(Number(un.avail) || 0);
  const buyers = Number(un.buyers) || 0;
  const overdue = Q(agingRes.rows[0]?.overdue_total);
  const overdueCount = Math.round(Number(agingRes.rows[0]?.overdue_count) || 0);
  const slow = Math.max(0, outstanding - overdue);

  // ── KPIs ──────────────────────────────────────────────────────────────
  const its = (n: number) => Math.round(n / 1e6 * 10) / 10;
  const kpis = [
    {
      label: "Gross development value",
      value: compact(gdv),
      chip: rnd((soldV / (gdv || 1)) * 100, 1) + "% sold",
      dir: "up",
      sub: projects.length + " projects",
      target: { screen: "dashboard", group: "portfolio" },
      spark: spark(projects.map((p) => p.gdv)),
    },
    {
      label: "Total sold value",
      value: compact(soldV),
      chip: rnd((collected / (soldV || 1)) * 100, 1) + "% collected",
      dir: "up",
      sub: rnd((soldV / (gdv || 1)) * 100, 1) + "% of GDV",
      target: { screen: "dashboard", group: "portfolio" },
      spark: spark(projects.map((p) => p.soldV)),
    },
    {
      label: "Collected to date",
      value: compact(collected),
      chip: rnd(its(Number(receiptsTot.rows[0]?.s) || 0), 1) + "M banked",
      dir: "up",
      sub: rnd((collected / (soldV || 1)) * 100, 1) + "% of sold",
      target: { screen: "payments", group: "finance" },
      spark: spark(projects.map((p) => p.gdv * (p.coll / 100))),
    },
    {
      label: "Outstanding receivable",
      value: compact(outstanding),
      chip: buyers + " buyers",
      dir: "down",
      sub: rnd((outstanding / (soldV || 1)) * 100, 1) + "% of sold",
      target: { screen: "collections", group: "finance" },
      spark: spark(projects.map((p) => p.soldV - p.soldV * (p.coll / 100))),
    },
    {
      label: "Overdue",
      value: compact(overdue),
      chip: overdueCount + " instalments",
      dir: "bad",
      sub: rnd((overdue / (outstanding || 1)) * 100, 1) + "% of outstanding",
      target: { screen: "collections", group: "finance" },
      spark: spark(overdue ? [overdue, overdue * 0.9, overdue * 0.8, overdue * 0.62, overdue * 0.41, overdue * 0.3] : [0, 0, 0, 0, 0, 0]),
    },
    {
      label: "Units available",
      value: availUnits + " of " + totalUnits,
      chip: "AED " + compact(Number(un.inv_val) || 0).replace("AED ", "") + " inventory",
      dir: "down",
      sub: rnd(((totalUnits - availUnits) / (totalUnits || 1)) * 100, 1) + "% sold through",
      target: { screen: "inventory", group: "project" },
      spark: spark(projects.map((p) => Math.max(0, p.units - (countByCode[p.code] || 0)))),
    },
  ];

  // ── donut / ageing ────────────────────────────────────────────────────
  const soldDenom = collected + slow + overdue || 1;
  const donutPct = Math.round((collected / (soldV || 1)) * 100);
  const donut = {
    pct: Math.max(0, Math.min(100, donutPct)),
    stops: [
      Math.round((collected / soldDenom) * 100),
      Math.round(((collected + slow) / soldDenom) * 100),
      100,
    ],
    legend: [
      ["Collected", compact(collected), "#4F46F5"],
      ["Outstanding", compact(slow), "#B9B4FA"],
      ["Overdue", compact(overdue), "#E5484D"],
    ] as [string, string, string][],
  };

  const ag = agingRes.rows[0] || {};
  const ageing: [string, number, number, number][] = [
    ["Current", Math.max(0, outstanding - Q(ag.overdue_total)), 0, 0],
    ["1–30", Q(ag.c30), Number(ag.n30) || 0, 1],
    ["31–60", Q(ag.c60), Number(ag.n60) || 0, 1],
    ["61–90", Q(ag.c90), Number(ag.n90) || 0, 1],
    ["90+", Q(ag.c90p), Number(ag.n90p) || 0, 1],
  ];
  const ageingMax = Math.max(...ageing.map((a) => a[1]), 1);
  const ageingPct = ageing.map((a) => {
    const w = a[1] === 0 ? 0 : Math.min(100, Math.round((a[1] / ageingMax) * 100));
    return [a[0], a[1], a[2], w] as [string, number, number, number];
  });

  // ── forecast buckets ──────────────────────────────────────────────────
  const buckets: Record<string, [string, number][]> = {
    "7": [["Mon", 0], ["Tue", 0], ["Wed", 0], ["Thu", 0], ["Fri", 0], ["Sat", 0], ["Sun", 0]],
    "30": [["W1", 0], ["W2", 0], ["W3", 0], ["W4", 0]],
    "90": [],
    "180": [],
  };
  const DAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  for (const r of fc7.rows) { const i = DAY[(r as any).d] ?? -1; if (i >= 0) buckets["7"][i] = [(r as any).d, its(Q(r.s))]; }
  for (const r of fc30.rows) { const w = Math.min(Math.max(Number((r as any).w), 1), 4); buckets["30"][w - 1] = ["W" + w, its(Q(r.s))]; }
  for (const r of fc90.rows) buckets["90"].push([(r as any).m, its(Q(r.s))]);
  for (const r of fc180.rows) buckets["180"].push([(r as any).m, its(Q(r.s))]);

  // ── attention ─────────────────────────────────────────────────────────
  const attMap: Record<string, { n: number; s: number }> = {};
  for (const r of attentionRes.rows) attMap[r.k] = { n: Number(r.n) || 0, s: Number(r.s) || 0 };

  const attention: { text: string; meta: string; value: string; tone: "red" | "amber"; target: { screen: string; group: string } }[] = [];
  if ((attMap.overdue90?.n || 0) > 0)
    attention.push({ text: `${attMap.overdue90.n} instalments overdue beyond 90 days`, meta: "Across projects", value: compact(attMap.overdue90.s), tone: "red", target: { screen: "collections", group: "finance" } });
  if ((attMap.escrow?.n || 0) > 0)
    attention.push({ text: `${attMap.escrow.n} escrow variances unmatched`, meta: "Reconciliation queue", value: String(attMap.escrow.n), tone: "red", target: { screen: "escrow", group: "finance" } });
  if ((attMap.approvals?.n || 0) > 0)
    attention.push({ text: `${attMap.approvals.n} bookings awaiting approval`, meta: "Sales approvals", value: String(attMap.approvals.n), tone: "amber", target: { screen: "booking", group: "sales" } });
  if ((attMap.negotiation?.n || 0) > 0)
    attention.push({ text: `${attMap.negotiation.n} leads sitting in negotiation`, meta: "Sales pipeline", value: String(attMap.negotiation.n), tone: "amber", target: { screen: "leads", group: "sales" } });
  if ((attMap.deeds?.n || 0) > 0)
    attention.push({ text: `${attMap.deeds.n} title deeds pending`, meta: "Compliance", value: String(attMap.deeds.n), tone: "red", target: { screen: "documents", group: "sales" } });

// ── sales velocity ────────────────────────────────────────────────────
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const thisWk = Math.ceil(((Number(now) - Number(start)) / 86400000 + 1) / 7);
  const bars: number[] = Array.from({ length: 12 }, () => 0);
  const wkRow = new Map<number, number>();
  for (const r of bookingWeeks.rows) wkRow.set(Number(r.w), Number(r.n) || 0);
  const base = thisWk - 11;
  for (let i = 0; i < 12; i++) {
    const w = base + i;
    const wk = ((w % 52) + 52) % 52;
    bars[i] = wkRow.get(wk) ?? wkRow.get(w) ?? 0;
  }
  const last90 = bookingWeeks.rows.reduce((a, r) => a + (Number(r.n) || 0), 0);
  const absorption = rnd(last90 / 3, 1);
  const stockMonths = absorption > 0 ? rnd(availUnits / absorption, 1) : 0;
  const velocity = {
    stats: [
      { label: "Absorption", value: absorption + " /mo" },
      { label: "Stock left", value: stockMonths + " mo" },
      { label: "Bookings (90d)", value: String(last90) },
    ],
    bars,
  };

  const metaDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const collectionRate = soldV > 0 ? collected / soldV : 0;

  ok(res, {
    meta: {
      projects: projects.length,
      units: totalUnits,
      date: metaDate,
    },
    projects,
    kpis,
    donut,
    ageing: ageingPct,
    forecast: { bars: buckets },
    attention,
    velocity,
    collectionRate,
    escrowBalance: its(Number(escrowRes.rows[0]?.bal) || 0),
  });
});