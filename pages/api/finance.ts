import type { NextApiRequest, NextApiResponse } from "next";
import { withPerm } from "../../lib/permissions";
import { query } from "../../lib/db";
import { ok } from "../../lib/api";
import type { CollectionRow, DrawdownRow, EscrowQueueRow, InvoiceRow } from "../../lib/api-types";

export default withPerm("Finance", "REA", async function (_req: NextApiRequest, res: NextApiResponse) {
  const [collections, escrow, drawdowns, invoices] = await Promise.all([
    query<CollectionRow>(
      `SELECT buyer, unit_no, amount, days_due, stage, action
       FROM collections ORDER BY days_due DESC`
    ),
    query<EscrowQueueRow>(
      `SELECT reference, amount, bank, system AS system_side, received_at
       FROM escrow_ledger WHERE matched = false ORDER BY received_at DESC`
    ),
    query<DrawdownRow>(
      `SELECT ref, milestone, amount, cert, rera, status
       FROM drawdowns ORDER BY id DESC`
    ),
    query<InvoiceRow>(
      `SELECT no, buyer, unit_no, milestone, due, amount, paid
       FROM invoices ORDER BY due DESC`
    ),
  ]);

  ok(res, {
    collections: collections.rows,
    escrow: {
      queue: escrow.rows,
      drawdowns: drawdowns.rows,
    },
    invoices: invoices.rows,
  });
});