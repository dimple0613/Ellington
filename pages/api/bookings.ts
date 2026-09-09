import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok, fail, methodNotAllowed, missingFields } from "../../lib/api";

const num = (v: unknown) => Number(v ?? 0);
const ymd = (d: unknown) => (d instanceof Date ? d.toLocaleDateString("en-CA") : d ? String(d).slice(0, 10) : "");

export const config = { api: { bodyParser: { sizeLimit: "1mb" } } };

export default withPerm("Sales", "REA", async function (req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") return listBookings(req, res);
  if (req.method === "POST") return createBooking(req, res);
  if (req.method === "PUT") return updateBooking(req, res);
  return methodNotAllowed(res);
});

async function listBookings(_: NextApiRequest, res: NextApiResponse) {
  try {
    const r = await query<any>(
      `SELECT b.id, b.ref, u.no AS unit_no, p.code AS project,
              COALESCE(b.buyer_name, buyer.name) AS buyer, b.status,
              b.discount_pct, b.discount_amt, b.list_price, b.net_price,
              b.booking_amount, b.payment_method, b.escrow_ref,
              b.created_at, b.confirmed_at, b.expected_spa
       FROM bookings b
       JOIN units u ON u.id = b.unit_id
       JOIN projects p ON p.id = b.project_id
       LEFT JOIN buyers buyer ON buyer.id = b.buyer_id
       ORDER BY b.created_at DESC, b.id DESC`
    );
    return ok(res, { bookings: r.rows.map((x) => ({
      id: x.id,
      ref: x.ref || null,
      unit_no: x.unit_no,
      project: x.project,
      buyer: x.buyer || "—",
      status: x.status,
      discount_pct: num(x.discount_pct),
      discount_amt: num(x.discount_amt),
      list_price: num(x.list_price),
      net_price: num(x.net_price),
      booking_amount: num(x.booking_amount),
      payment_method: x.payment_method || null,
      escrow_ref: x.escrow_ref || null,
      created_at: x.created_at,
      expected_spa: ymd(x.expected_spa),
    })) });
  } catch (e: any) {
    return fail(res, "Failed to load bookings: " + (e?.message || e), 500);
  }
}

async function createBooking(req: NextApiRequest, res: NextApiResponse) {
  const b = req.body || {};
  if (b.unit_id == null && !b.unit_no) return fail(res, "unit_id or unit_no is required", 400);

  let { rows: unit } = await query<any>("SELECT id, project_id, no, price, status FROM units WHERE id = $1", [num(b.unit_id)]);
  if (unit.length === 0 && b.unit_no) {
    unit = (await query<any>("SELECT id, project_id, no, price, status FROM units WHERE no = $1 ORDER BY id LIMIT 1", [String(b.unit_no)])).rows;
  }
  if (unit.length === 0) return fail(res, "Unit not found", 404);
  const u = unit[0];

  const listPrice = num(b.list_price || u.price);
  const discountPct = num(b.discount_pct);
  const discountAmt = num(b.discount_amt);
  const netPrice = num(b.net_price) || (listPrice - discountPct / 100 * listPrice - discountAmt);
  const bookingAmount = num(b.booking_amount) || Math.round(netPrice * 0.1);

  // auto-generate a booking reference if not supplied
  let ref = (b.ref as string) || null;
  if (!ref) {
    const seq = await query<any>(`SELECT COALESCE(MAX(id), 0) + 1 AS n FROM bookings`);
    ref = "BKG-" + String(2026) + "-" + String(seq.rows[0].n).padStart(5, "0");
  }

  try {
    const r = await query<any>(
      `INSERT INTO bookings (project_id, unit_id, buyer_name, buyer_mobile, buyer_email, ref,
         discount_pct, discount_amt, list_price, net_price, booking_amount,
         dld_payer, admin_fee, broker_involved, agency, agent, commission_pct,
         expected_spa, status)
       VALUES ($1,$2,$3,$4,$5,$6, $7,$8,$9,$10,$11, $12,$13,$14,$15,$16,$17, $18,$19::text)
       RETURNING id`,
      [u.project_id, u.id, b.buyer_name || null, b.buyer_mobile || null, b.buyer_email || null, ref,
        discountPct, discountAmt, listPrice, netPrice, bookingAmount,
        b.dld_payer || "buyer", num(b.admin_fee), !!b.broker_involved, b.agency || null, b.agent || null, num(b.commission_pct),
        b.expected_spa ? String(b.expected_spa) : null, b.status || "draft"]
    );
    return ok(res, { id: r.rows[0].id, ref, unit: u.no, status: b.status || "draft" }, 201);
  } catch (e: any) {
    return fail(res, "Failed to create booking: " + (e?.message || e), 500);
  }
}

async function updateBooking(req: NextApiRequest, res: NextApiResponse) {
  const id = Number(req.query.id);
  if (!Number.isInteger(id) || id <= 0) return fail(res, "Invalid booking id", 400);
  const { action, ...b } = req.body || {};

  if (action === "confirm") {
    return confirmBooking(id, b, res);
  }
  if (action === "cancel") {
    try {
      await query("UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1", [id]);
      return ok(res, { id, status: "cancelled" });
    } catch (e: any) {
      return fail(res, "Failed to cancel booking: " + (e?.message || e), 500);
    }
  }

  return fail(res, "Unknown booking action", 400);
}

async function confirmBooking(id: number, b: any, res: NextApiResponse) {
  const missing = missingFields(b, ["escrow_ref"]);
  if (missing) return fail(res, "All buyer funds must be deposited to the project escrow account (" + missing + ")", 400);

  const { rows } = await query<any>("SELECT bk.*, u.no AS unit_no, u.project_id, u.id AS unit_id FROM bookings bk JOIN units u ON u.id = bk.unit_id WHERE bk.id = $1", [id]);
  if (rows.length === 0) return fail(res, "Booking not found", 404);
  const bk = rows[0];

  try {
    // Upsert buyer from booking payload if a buyer_id wasn't attached
    let buyerId = bk.buyer_id;
    if (!buyerId) {
      const { rows: ins } = await query<any>(
        `INSERT INTO buyers (name, email, phone) VALUES ($1,$2,$3) RETURNING id`,
        [bk.buyer_name || bk.buyer_name || "Booking buyer", b.buyer_email || bk.buyer_email, b.buyer_mobile || bk.buyer_mobile || null]
      );
      buyerId = ins[0].id;
    }

    // Create the receipt for the booking payment
    const { rows: rcp } = await query<any>(
      `INSERT INTO receipts (project_id, unit_id, buyer_id, amount, method, reference, received_at)
       VALUES ($1,$2,$3,$4,$5,$6, now()) RETURNING id`,
      [bk.project_id, bk.unit_id, buyerId, bk.booking_amount, b.payment_method || bk.payment_method || "bank_transfer", b.payment_reference || null]
    );

    // Mark unit reserved
    await query("UPDATE units SET status = 'reserved', buyer_id = $2 WHERE id = $1", [bk.unit_id, buyerId]);
    // Advance any linked lead to booked
    await query("UPDATE leads SET stage = 'booked', stage_changed_at = now() WHERE id IN (SELECT id FROM leads WHERE phone = $1 AND stage <> 'booked' LIMIT 1)", [bk.buyer_mobile || bk.buyer_name || ""]);

    // Finalize the booking
    await query(
      `UPDATE bookings SET buyer_id = $2, status = 'confirmed', receipt_id = $3,
         payment_method = $4, payment_bank = $5, payment_cheque_no = $6, payment_reference = $7,
         escrow_ref = $8, discount_pct = $9, discount_amt = $10, net_price = $11, booking_amount = $12,
         confirmed_at = now(), updated_at = now()
       WHERE id = $1`,
      [id, buyerId, rcp[0].id, b.payment_method || bk.payment_method || "bank_transfer",
        b.payment_bank || bk.payment_bank || null, b.payment_cheque_no || bk.payment_cheque_no || null,
        b.payment_reference || null, b.escrow_ref, num(b.discount_pct ?? bk.discount_pct),
        num(b.discount_amt ?? bk.discount_amt), num(b.net_price ?? bk.net_price), num(b.booking_amount ?? bk.booking_amount)]
    );

    return ok(res, {
      id,
      ref: bk.ref,
      unit: bk.unit_no,
      buyerId,
      receiptId: rcp[0].id,
      status: "confirmed",
    });
  } catch (e: any) {
    return fail(res, "Failed to confirm booking: " + (e?.message || e), 500);
  }
}