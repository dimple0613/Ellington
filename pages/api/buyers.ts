import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed } from "../../lib/api";

const num = (v: unknown) => Number(v ?? 0);
const ymd = (d: unknown) =>
  d instanceof Date ? d.toLocaleDateString("en-CA") : d ? String(d).slice(0, 10) : "";

export default withPerm("Sales", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return methodNotAllowed(res);

  const id = typeof req.query.id === "string" ? req.query.id : null;

  try {
    if (!id) {
      const r = await query<any>(
        `SELECT b.id, b.name, b.email, b.phone, b.kyc_status,
                COALESCE(u.n, 0)::int AS units,
                COALESCE(u.c, 0)::numeric AS contracted,
                COALESCE(rc.c, 0)::numeric AS collected,
                COALESCE(od.c, 0)::numeric AS overdue,
                nd.amount AS next_amount, nd.due_date AS next_date, nd.unit_no AS next_unit, nd.milestone AS next_milestone,
                bk.agency AS agency, bk.agent AS agent,
                COALESCE(d.n, 0)::int AS docs
         FROM buyers b
         LEFT JOIN (
           SELECT buyer_id, COUNT(*)::int AS n, SUM(price) AS c FROM units WHERE buyer_id IS NOT NULL GROUP BY buyer_id
         ) u ON u.buyer_id = b.id
         LEFT JOIN (
           SELECT buyer_id, SUM(amount) AS c FROM receipts WHERE buyer_id IS NOT NULL AND (pdc_status IS NULL OR pdc_status <> 'Bounced') GROUP BY buyer_id
         ) rc ON rc.buyer_id = b.id
         LEFT JOIN (
           SELECT u.buyer_id, SUM(m.amount) AS c
           FROM payment_milestones m JOIN units u ON u.id = m.unit_id
           WHERE m.status <> 'paid' AND m.due_date < CURRENT_DATE
           GROUP BY u.buyer_id
         ) od ON od.buyer_id = b.id
         LEFT JOIN LATERAL (
           SELECT m.amount, m.due_date, m.milestone, u.no AS unit_no
           FROM payment_milestones m JOIN units u ON u.id = m.unit_id
           WHERE u.buyer_id = b.id AND m.status <> 'paid' AND m.due_date >= CURRENT_DATE
           ORDER BY m.due_date LIMIT 1
         ) nd ON true
         LEFT JOIN LATERAL (
           SELECT bk.agency, bk.agent
           FROM bookings bk
           WHERE (bk.buyer_id = b.id OR bk.buyer_name = b.name) AND bk.status = 'confirmed'
           ORDER BY bk.confirmed_at DESC NULLS LAST, bk.id DESC LIMIT 1
         ) bk ON true
         LEFT JOIN LATERAL (
           SELECT COUNT(*)::int AS n
           FROM documents d
           WHERE d.buyer = b.name
         ) d ON true
         ORDER BY contracted DESC NULLS LAST, b.name`
      );
      return ok(res, {
        buyers: r.rows.map((x) => {
          const contracted = num(x.contracted);
          return {
            id: x.id,
            name: x.name,
            email: x.email || null,
            phone: x.phone || null,
            kyc: x.kyc_status || "pending",
            units: x.units,
            contracted,
            collected: num(x.collected),
            outstanding: Math.max(0, contracted - num(x.collected)),
            overdue: num(x.overdue),
            agent: x.agent || null,
            agency: x.agency || null,
            docCount: x.docs || 0,
            next: x.next_amount != null
              ? { amount: num(x.next_amount), date: ymd(x.next_date), unit: x.next_unit, milestone: x.next_milestone }
              : null,
          };
        }),
      });
    }

    const bid = Number(id);
    if (!Number.isInteger(bid) || bid <= 0) return fail(res, "Invalid buyer id", 400);

    const [head, units, ledger, sched, over] = await Promise.all([
      query<any>("SELECT id, name, email, phone, kyc_status FROM buyers WHERE id = $1", [bid]),
      query<any>(
        `SELECT u.no, u.status, u.type, u.beds, u.area, u.price, u."view",
                COALESCE(pm.paid, 0)::numeric AS paid
         FROM units u
         LEFT JOIN (
           SELECT unit_id, SUM(amount) AS paid FROM payment_milestones WHERE status = 'paid' GROUP BY unit_id
         ) pm ON pm.unit_id = u.id
         WHERE u.buyer_id = $1 ORDER BY u.id`,
        [bid]
      ),
      query<any>(
        `SELECT u.no, m.id, m.milestone, m.due_date, m.amount, r.reference
         FROM payment_milestones m
         JOIN units u ON u.id = m.unit_id
         LEFT JOIN receipts r ON r.unit_id = u.id AND r.amount = m.amount
         WHERE u.buyer_id = $1 AND m.status = 'paid'
         ORDER BY m.due_date, m.id`,
        [bid]
      ),
      query<any>(
        `SELECT to_char(m.due_date, 'YYYY-MM') AS ym, SUM(m.amount) AS amt
         FROM payment_milestones m
         JOIN units u ON u.id = m.unit_id
         WHERE u.buyer_id = $1 AND m.status <> 'paid'
           AND m.due_date >= CURRENT_DATE
           AND m.due_date < (CURRENT_DATE + INTERVAL '12 months')::date
         GROUP BY ym ORDER BY ym`,
        [bid]
      ),
      query<any>(
        `SELECT COALESCE(SUM(m.amount) FILTER (WHERE m.status <> 'paid' AND m.due_date < CURRENT_DATE), 0)::numeric AS overdue,
                COUNT(*) FILTER (WHERE m.status = 'paid')::int AS paid,
                COUNT(*)::int AS total,
                MIN(m.due_date) FILTER (WHERE m.status = 'paid')::date AS first_paid
         FROM payment_milestones m
         JOIN units u ON u.id = m.unit_id
         WHERE u.buyer_id = $1`,
        [bid]
      ),
    ]);

    if (head.rows.length === 0) return fail(res, "Buyer not found", 404);
    const buyerRow = head.rows[0];

    const [docsRows, agentRows] = await Promise.all([
      query<any>(
        `SELECT doc_type, unit_no, ref, status, generated_at FROM documents WHERE buyer = $1 ORDER BY generated_at DESC, id DESC`,
        [buyerRow.name]
      ),
      query<any>(
        `SELECT bk.agency, bk.agent, bk.commission_pct
         FROM bookings bk
         WHERE (bk.buyer_id = $1 OR bk.buyer_name = $2) AND bk.status = 'confirmed'
         ORDER BY bk.confirmed_at DESC NULLS LAST, bk.id DESC LIMIT 1`,
        [bid, buyerRow.name]
      ),
    ]);

    const contracted = units.rows.reduce((a: number, x: any) => a + num(x.price), 0);
    const collected = units.rows.reduce((a: number, x: any) => a + num(x.paid), 0);
    let balance = contracted;
    const seen = new Set<number>();
    const ledgerRows = [];
    for (const x of ledger.rows) {
      if (seen.has(x.id)) continue;
      seen.add(x.id);
      const credit = num(x.amount);
      balance -= credit;
      ledgerRows.push({
        date: ymd(x.due_date),
        unit: x.no,
        desc: x.milestone + (x.reference ? " \u00b7 " + x.reference : ""),
        debit: null,
        credit,
        balance,
      });
    }

    const nextRows = over.rows[0] || { overdue: 0, paid: 0, total: 0, first_paid: null };
    const next = await query<any>(
      `SELECT m.amount, m.due_date, m.milestone, u.no AS unit_no
       FROM payment_milestones m JOIN units u ON u.id = m.unit_id
       WHERE u.buyer_id = $1 AND m.status <> 'paid' AND m.due_date >= CURRENT_DATE
       ORDER BY m.due_date LIMIT 1`,
      [bid]
    );

    const b = buyerRow;
    return ok(res, {
      buyer: {
        id: b.id,
        name: b.name,
        email: b.email || null,
        phone: b.phone || null,
        kyc: b.kyc_status || "pending",
        agent: agentRows.rows[0]?.agent || null,
        agency: agentRows.rows[0]?.agency || null,
        docs: docsRows.rows.map((d: any) => ({
          doc_type: d.doc_type,
          unit_no: d.unit_no || null,
          ref: d.ref,
          status: d.status || "generated",
          generated_at: ymd(d.generated_at),
        })),
        units: units.rows.map((x: any) => ({
          no: x.no,
          status: x.status,
          type: x.type,
          beds: x.beds,
          area: num(x.area),
          price: num(x.price),
          view: x.view || "",
          pct: Math.min(100, Math.round((num(x.paid) / Math.max(1, num(x.price))) * 100)),
        })),
        ledger: ledgerRows,
        schedule: sched.rows.map((x: any) => ({ ym: x.ym, amt: num(x.amt) })),
        next: next.rows[0]
          ? { amount: num(next.rows[0].amount), date: ymd(next.rows[0].due_date), unit: next.rows[0].unit_no, milestone: next.rows[0].milestone }
          : null,
        overdue: num(nextRows.overdue),
        firstPaid: ymd(nextRows.first_paid),
        miles: { paid: nextRows.paid, total: nextRows.total },
      },
    });
  } catch (e: any) {
    return fail(res, "Failed to load buyers: " + (e?.message || e), 500);
  }
});