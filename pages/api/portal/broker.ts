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

  const acct = await query<{ id: number; agency_id: number; password_hash: string; enabled: boolean }>(
    `SELECT a.id, a.agency_id, a.password_hash, a.enabled
     FROM broker_portal_accounts a
     WHERE lower(a.email) = lower($1) LIMIT 1`,
    [e]
  );
  if (!acct.rows.length) return fail(res, "No portal account for that email", 401);
  const row = acct.rows[0];
  if (!row.enabled) return fail(res, "Account disabled", 403);
  const okPw = await verifyPassword(String(password), row.password_hash);
  if (!okPw) return fail(res, "Incorrect email or password", 401);

  const ag = await query<{ name: string }>("SELECT name FROM broker_agencies WHERE id = $1", [row.agency_id]);
  const token = await signPortal({ kind: "broker", id: row.agency_id, email: e, name: ag.rows[0]?.name || e });
  setPortalCookie(res, token);
  return ok(res, { session: { kind: "broker", id: row.agency_id, email: e, name: ag.rows[0]?.name || "" } });
}

async function enableHandler(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body || {};
  const agencyId = Math.round(Number(body.agency_id));
  if (!agencyId) return fail(res, "agency_id is required");

  const agency = await query<{ name: string }>("SELECT name FROM broker_agencies WHERE id = $1", [agencyId]);
  if (!agency.rows.length) return fail(res, "Agency not found", 404);
  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return fail(res, "A valid email is required for the portal account");

  const existing = await query<{ id: number }>("SELECT id FROM broker_portal_accounts WHERE lower(email) = lower($1)", [email]);
  const tempPw = Math.random().toString(36).slice(2, 8) + "A1!";
  const pwHash = await hashPassword(tempPw);
  let created = false;
  if (existing.rows.length) {
    await query("UPDATE broker_portal_accounts SET agency_id = $1, password_hash = $2, enabled = true, updated_at = now() WHERE id = $3", [agencyId, pwHash, existing.rows[0].id]);
  } else {
    await query("INSERT INTO broker_portal_accounts (agency_id, email, password_hash, enabled) VALUES ($1,$2,$3,true)", [agencyId, email, pwHash]);
    created = true;
  }

  const origin = req.headers.origin || "http://localhost:3000";
  const href = origin + "/portal/broker";
  await sendPortalInvite("broker", email, agency.rows[0].name, tempPw, href);

  await query(
    `INSERT INTO audit_log (actor, module, action, entity, detail) VALUES ($1,'Sales','broker_portal_enable',$2,$3)`,
    ["system", "agency:" + agencyId, JSON.stringify({ email, created })]
  ).catch(() => {});

  return ok(res, { enabled: true, email, created, temp_pw: tempPw, name: agency.rows[0].name });
}

async function dataHandler(req: NextApiRequest, res: NextApiResponse, session: PortalSession) {
  const agency = await query<any>(
    `SELECT id, name, COALESCE(orn,'') AS orn, alloc_units, deals, accrued, paid, commission_rate, status
     FROM broker_agencies WHERE id = $1`,
    [session.id]
  );
  if (!agency.rows.length) { clearPortalCookie(res); return fail(res, "Agency not found", 401); }
  const a = agency.rows[0];

  const reservations = await query<any>(
    `SELECT id, unit_no, project_code, buyer_name, buyer_mobile, commission_pct, status, created_at
     FROM broker_reservations WHERE agency_id = $1 ORDER BY created_at DESC LIMIT 40`,
    [session.id]
  );

  const inventory = await query<any>(
    `SELECT u.id, u.no, u.type, u.beds, u.area, u."view", u.price, p.code AS project_code, p.name AS project_name
     FROM units u JOIN projects p ON p.id = u.project_id
     WHERE u.status = 'available'
     ORDER BY p.code, u.no LIMIT 250`
  );

  const reservedNos = new Set(reservations.rows.filter((r: any) => r.status === "pending" || r.status === "approved").map((r: any) => r.unit_no));

  return ok(res, {
    me: {
      name: a.name,
      orn: a.orn,
      status: a.status,
      commission_rate: a.commission_rate,
      alloc_units: a.alloc_units,
      deals: a.deals,
      accrued: Number(a.accrued),
      paid: Number(a.paid),
    },
    reservations: reservations.rows,
    inventory: inventory.rows.map((u: any) => ({
      ...u,
      price: Number(u.price),
      reserved: reservedNos.has(u.no),
    })),
  });
}

async function reserveHandler(req: NextApiRequest, res: NextApiResponse, session: PortalSession) {
  const body = req.body || {};
  const unitId = Math.round(Number(body.unit_id));
  if (!unitId) return fail(res, "unit_id is required");

  const unit = await query<any>(
    `SELECT u.id, u.no, p.code AS project_code, u.buyer_id
     FROM units u JOIN projects p ON p.id = u.project_id WHERE u.id = $1`,
    [unitId]
  );
  if (!unit.rows.length) return fail(res, "Unit not found", 404);
  if (unit.rows[0].buyer_id) return fail(res, "Unit already allocated");

  const agency = await query<any>("SELECT name, commission_rate FROM broker_agencies WHERE id = $1", [session.id]);
  const ag = agency.rows[0];

  await query(
    `INSERT INTO broker_reservations (agency_id, agency_name, unit_id, unit_no, project_code, status)
     VALUES ($1,$2,$3,$4,$5,'pending')`,
    [session.id, ag?.name || "", unit.rows[0].id, unit.rows[0].no, unit.rows[0].project_code]
  );
  await query(
    `INSERT INTO broker_activity (text, meta, kind) VALUES ($1, $2, 'reservation')`,
    [`${ag?.name || "Agency"} reserved ${unit.rows[0].no} from the portal`, unit.rows[0].project_code]
  ).catch(() => {});

  return ok(res, { reserved: true, unit_no: unit.rows[0].no });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    return withPortalSession("broker", dataHandler)(req, res);
  }
  if (req.method === "POST") {
    const action = String((req.body || {}).action || "login");
    if (action === "login") return loginHandler(req, res);
    if (action === "enable") {
      return withSession(async (req2, res2, session) => {
        if (!(await hasPerm(session, "Sales", "CRE"))) {
          return res2.status(403).json({ error: "You don't have permission to enable portal access." });
        }
        return enableHandler(req2, res2);
      })(req, res);
    }
    if (action === "reserve") {
      return withPortalSession("broker", reserveHandler)(req, res);
    }
    if (action === "logout") {
      clearPortalCookie(res);
      return ok(res, { loggedOut: true });
    }
    return fail(res, "unknown action");
  }
  return methodNotAllowed(res);
}
