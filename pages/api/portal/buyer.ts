import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "../../../lib/db";
import { ok, fail, methodNotAllowed, validEmail } from "../../../lib/api";
import { signPortal, setPortalCookie, clearPortalCookie, withPortalSession } from "../../../lib/portal";
import type { PortalSession } from "../../../lib/portal";
import { hashPassword, verifyPassword } from "../../../lib/auth";
import { sendPortalInvite } from "../../../lib/mail";
import { withSession } from "../../../lib/session";
import { hasPerm } from "../../../lib/permissions";

async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
  const { email, password } = req.body || {};
  const e = String(email || "").trim().toLowerCase();
  if (!validEmail(e) || !password) return fail(res, "email and password are required");

  const acct = await query<{ id: number; buyer_id: number; password_hash: string; enabled: boolean }>(
    `SELECT a.id, a.buyer_id, a.password_hash, a.enabled
     FROM buyer_portal_accounts a
     WHERE lower(a.email) = lower($1) LIMIT 1`,
    [e]
  );
  if (!acct.rows.length) return fail(res, "No portal account for that email", 401);
  const row = acct.rows[0];
  if (!row.enabled) return fail(res, "Account disabled", 403);
  const okPw = await verifyPassword(String(password), row.password_hash);
  if (!okPw) return fail(res, "Incorrect email or password", 401);

  const buyer = await query<{ name: string }>("SELECT name FROM buyers WHERE id = $1", [row.buyer_id]);
  const token = await signPortal({ kind: "buyer", id: row.buyer_id, email: e, name: buyer.rows[0]?.name || e });
  setPortalCookie(res, token);
  return ok(res, { session: { kind: "buyer", id: row.buyer_id, email: e, name: buyer.rows[0]?.name || "" } });
}

async function inviteHandler(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body || {};
  const buyerId = Math.round(Number(body.buyer_id));
  if (!buyerId) return fail(res, "buyer_id is required");

  const buyer = await query<{ name: string; email: string }>("SELECT name, COALESCE(email,'') AS email FROM buyers WHERE id = $1", [buyerId]);
  if (!buyer.rows.length) return fail(res, "Buyer not found", 404);
  const email = String(body.email || buyer.rows[0].email || "").trim().toLowerCase();
  if (!validEmail(email)) return fail(res, "A valid email is required for the portal account");

  const existing = await query<{ id: number }>("SELECT id FROM buyer_portal_accounts WHERE lower(email) = lower($1)", [email]);
  const tempPw = Math.random().toString(36).slice(2, 8) + "A1!";
  const pwHash = await hashPassword(tempPw);
  let created = false;
  if (existing.rows.length) {
    await query("UPDATE buyer_portal_accounts SET buyer_id = $1, password_hash = $2, enabled = true, updated_at = now() WHERE id = $3", [buyerId, pwHash, existing.rows[0].id]);
  } else {
    await query("INSERT INTO buyer_portal_accounts (buyer_id, email, password_hash, enabled) VALUES ($1,$2,$3,true)", [buyerId, email, pwHash]);
    created = true;
  }

  const origin = req.headers.origin || "http://localhost:3000";
  const href = origin + "/portal/buyer";
  await sendPortalInvite("buyer", email, buyer.rows[0].name, tempPw, href);

  await query(
    `INSERT INTO audit_log (actor, module, action, entity, detail) VALUES ($1,'Sales','buyer_portal_invite',$2,$3)`,
    ["system", "buyer:" + buyerId, JSON.stringify({ email, created })]
  ).catch(() => {});

  return ok(res, { invited: true, email, created, temp_pw: tempPw, name: buyer.rows[0].name });
}

async function dataHandler(req: NextApiRequest, res: NextApiResponse, session: PortalSession) {
  const buyer = await query<{ name: string; phone: string; kyc_status: string }>(
    "SELECT name, COALESCE(phone,'') AS phone, kyc_status FROM buyers WHERE id = $1",
    [session.id]
  );
  if (!buyer.rows.length) { clearPortalCookie(res); return fail(res, "Buyer not found", 401); }
  const b = buyer.rows[0];

  const units = await query<any>(
    `SELECT u.id, u.no, u.type, u.beds, u.area, u."view", u.status, u.price,
            p.code AS project_code, p.name AS project_name
     FROM units u JOIN projects p ON p.id = u.project_id
     WHERE u.buyer_id = $1 ORDER BY p.code, u.no`,
    [session.id]
  );

  const projectIds = Array.from(new Set(units.rows.map((u) => u.project_code as string)));
  const projectIdRows = projectIds.length
    ? await query<{ id: number }>("SELECT id FROM projects WHERE code = ANY($1)", [projectIds])
    : { rows: [] as { id: number }[] };

  const plan: { unit_no: string; label: string; pct: number; amount: number; paid: boolean }[] = [];
  for (const u of units.rows) {
    const proj = await query<any>("SELECT setup FROM projects WHERE code = $1 LIMIT 1", [u.project_code]);
    const setup = proj.rows[0]?.setup || {};
    const steps = Array.isArray(setup.payment_plan) ? setup.payment_plan : [
      { label: "Booking amount", pct: 10 },
      { label: "On SPA", pct: 20 },
      { label: "Handover", pct: 50 },
      { label: "1 year after handover", pct: 20 },
    ];
    const receipts = await query<{ total: string }>(
      "SELECT COALESCE(SUM(amount),0)::text AS total FROM receipts WHERE buyer_id = $1 AND unit_id = $2 AND matched = true",
      [session.id, u.id]
    );
    const paidTotal = Number(receipts.rows[0]?.total || 0);
    const net = Number(u.price) || 0;
    let cumulative = 0;
    steps.forEach((s: any, i: number) => {
      const amount = Math.round(net * (Number(s.pct) || 0) / 100);
      cumulative += amount;
      plan.push({
        unit_no: u.no,
        label: String(s.label || "Milestone " + (i + 1)),
        pct: Number(s.pct) || 0,
        amount,
        paid: paidTotal >= cumulative,
      });
    });
  }

  const receipts = await query<any>(
    `SELECT method, amount, reference, received_at FROM receipts
     WHERE buyer_id = $1 ORDER BY received_at DESC LIMIT 40`,
    [session.id]
  );

  const docs = await query<any>(
    `SELECT doc_type, ref, status, generated_at FROM documents
     WHERE lower(COALESCE(buyer,'')) = lower($1)
        OR unit_no = ANY($2)
     ORDER BY generated_at DESC LIMIT 30`,
    [b.name, units.rows.map((u) => u.no as string)]
  );

  const construction = [];
  for (const pid of projectIdRows.rows.slice(0, 1)) {
    const stages = await query<any>(
      "SELECT milestone, status, planned_pct, actual_pct FROM construction_milestones WHERE project_id = $1 ORDER BY planned",
      [pid.id]
    );
    construction.push(...stages.rows);
  }

  return ok(res, {
    me: { name: b.name, phone: b.phone, kyc: b.kyc_status },
    units: units.rows,
    schedule: plan,
    receipts: receipts.rows.map((r: any) => ({
      method: r.method,
      amount: Number(r.amount),
      reference: r.reference,
      received_at: r.received_at,
    })),
    documents: docs.rows,
    construction: construction.map((c: any) => ({
      milestone: c.milestone,
      status: c.status,
      planned: c.planned_pct,
      actual: c.actual_pct,
    })),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return withPortalSession("buyer", dataHandler)(req, res);
  }
  if (req.method === "POST") {
    const action = String((req.body || {}).action || "login");
    if (action === "login") return loginHandler(req, res);
    if (action === "invite") {
      return withSession(async (req2, res2, session) => {
        if (!(await hasPerm(session, "Sales", "CRE"))) {
          return res2.status(403).json({ error: "You don't have permission to invite portal users." });
        }
        return inviteHandler(req2, res2);
      })(req, res);
    }
    if (action === "logout") {
      clearPortalCookie(res);
      return ok(res, { loggedOut: true });
    }
    return fail(res, "unknown action");
  }
  return methodNotAllowed(res);
}
