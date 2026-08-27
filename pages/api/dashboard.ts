import { withSession } from "../../lib/session";
import { query } from "../../lib/db";

export default withSession(async function (req, res) {
  const s = await query<any>(
    "SELECT COUNT(*)::int AS n FROM units"
  ).catch(() => ({ rows: [{ n: 0 }] }));
  const pjson = await query<any>(`
    SELECT
      COALESCE(SUM((SELECT COALESCE(SUM(ua.amount),0) FROM receipts ua WHERE ua.project_id = p.id)),0) AS portfolio
    FROM projects p
  `).catch(() => ({ rows: [{ portfolio: 0 }] }));

  const nu = await query<any>(
    "SELECT status, COUNT(*)::int AS n FROM units GROUP BY status ORDER BY n DESC"
  ).catch(() => ({ rows: [] }));

  const needs = await query<any>(`
    SELECT p.name AS project, u.no AS unit, b.name AS buyer,
      p.due_date AS lead_days
    FROM units u
    JOIN projects p ON p.id = u.project_id
    LEFT JOIN buyers b ON b.id = u.buyer_id
    WHERE u.status IN ('booked','sold')
    ORDER BY p.due_date LIMIT 8
  `).catch(() => ({ rows: [] }));

  const monies = await query<any>(`
    SELECT
      COALESCE(SUM((SELECT COALESCE(SUM(r.amount),0) FROM receipts r WHERE r.project_id = p.id)),0) AS received,
      COALESCE(SUM(p.gdv),0) AS expected
    FROM projects p
  `).catch(() => ({ rows: [{ received: 0, expected: 0 }] }));

  return res.status(200).json({
    db: true,
    units: s.rows[0].n,
    portfolio: pjson.rows[0].portfolio,
    dashboard_kpi: {
      portfolio_confirmed: monies.rows[0].expected,
      received_actual: monies.rows[0].received,
    },
    units_by_status: nu.rows,
    needs_review: needs.rows,
  });
});