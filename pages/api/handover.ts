import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok } from "../../lib/api";

export default withPerm("Handover", "REA", async function (_req: NextApiRequest, res: NextApiResponse) {
  const [pipeline, snagging, deeds, unpaidInvoices, overdue] = await Promise.all([
    query<any>(
      `SELECT unit_no, buyer, stage, meta, updated_at
       FROM pipeline_items ORDER BY updated_at DESC`
    ),
    query<any>(
      `SELECT id, unit_no, loc, trade, description AS "desc", sev, contractor, status, reinspect
       FROM snag_items ORDER BY id`
    ),
    query<any>(
      `SELECT id, unit_no, buyer, oqood, dld, deed, issued, keys, oa
       FROM deeds ORDER BY id`
    ),
    query<any>(
      `SELECT unit_no, COALESCE(SUM(amount),0) AS outstanding, COUNT(*) AS n
       FROM invoices WHERE paid = false AND voided_at IS NULL
       GROUP BY unit_no`
    ),
    query<any>(
      `SELECT c.unit_no, COALESCE(SUM(c.amount),0) AS overdue, (array_agg(c.buyer))[1] AS buyer
       FROM collections c
       GROUP BY c.unit_no`
    ),
  ]);

  const outstandingByUnit: Record<string, number> = {};
  for (const r of unpaidInvoices.rows) outstandingByUnit[r.unit_no] = Number(r.outstanding) || 0;
  const overdueByUnit: Record<string, { amt: number; buyer: string }> = {};
  for (const r of overdue.rows) overdueByUnit[r.unit_no] = { amt: Number(r.overdue) || 0, buyer: r.buyer || "" };

  const criticalSnags: Record<string, number> = {};
  for (const s of snagging.rows) {
    if (s.sev === "Critical" && ["Open", "In progress"].includes(s.status)) {
      criticalSnags[s.unit_no] = (criticalSnags[s.unit_no] || 0) + 1;
    }
  }

  const deedBlocked: Record<string, boolean> = {};
  for (const d of deeds.rows) if (d.deed === "Blocked") deedBlocked[d.unit_no] = true;

  const buyerByUnit: Record<string, string> = {};
  for (const p of pipeline.rows) buyerByUnit[p.unit_no] = p.buyer || buyerByUnit[p.unit_no] || "";
  for (const d of deeds.rows) buyerByUnit[d.unit_no] = d.buyer || buyerByUnit[d.unit_no] || "";
  for (const u of Object.keys(overdueByUnit)) buyerByUnit[u] = overdueByUnit[u].buyer || buyerByUnit[u] || "";

  const stageByUnit: Record<string, string> = {};
  for (const p of pipeline.rows) stageByUnit[p.unit_no] = p.stage || "";

  const units = new Set<string>([
    ...pipeline.rows.map((r: any) => r.unit_no),
    ...Object.keys(outstandingByUnit),
    ...Object.keys(overdueByUnit),
    ...Object.keys(criticalSnags),
    ...Object.keys(deedBlocked),
  ].filter(Boolean));

  const fmt = (n: number) => (n || 0).toLocaleString("en-US");

  const readiness: any[] = [];
  for (const unit_no of units) {
    if (!/^WPK/i.test(unit_no)) continue;
    const outstanding = outstandingByUnit[unit_no] || 0;
    const overdueAmt = overdueByUnit[unit_no]?.amt || 0;
    const paymentOk = !(outstanding > 0 || overdueAmt > 0);
    const snagsOk = !(criticalSnags[unit_no] || 0);
    const docsOk = !deedBlocked[unit_no];

    let reason = "";
    let detail = "";
    if (!paymentOk) {
      reason = "Outstanding payment";
      detail = "AED " + fmt(outstanding + overdueAmt);
    } else if (!snagsOk) {
      reason = "Snags open";
      detail = criticalSnags[unit_no] + " item" + (criticalSnags[unit_no] > 1 ? "s" : "") + " · critical";
    } else if (!docsOk) {
      reason = "Documents missing";
      detail = "Title deed blocked";
    }

    readiness.push({
      unit_no,
      buyer: buyerByUnit[unit_no] || "—",
      stage: stageByUnit[unit_no] || "",
      payment_ok: paymentOk,
      snags_ok: snagsOk,
      docs_ok: docsOk,
      blocked: !!reason,
      reason,
      detail,
    });
  }

  const blocked = readiness
    .filter((r) => r.blocked)
    .sort((a, b) => a.unit_no.localeCompare(b.unit_no));

  const overview = {
    total: readiness.length,
    ready: readiness.length - blocked.length,
    blocked: blocked.length,
    blocked_payment: blocked.filter((b) => b.reason === "Outstanding payment").length,
    blocked_snags: blocked.filter((b) => b.reason === "Snags open").length,
    blocked_docs: blocked.filter((b) => b.reason === "Documents missing").length,
  };

  ok(res, {
    pipeline: pipeline.rows,
    snagging: snagging.rows,
    deeds: deeds.rows,
    readiness,
    overview,
  });
});