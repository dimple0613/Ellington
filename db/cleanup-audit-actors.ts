// DI-01 cleanup: remove the training/fictional rows that an older schema.sql seeded
// into audit_log (Khalid Al Fahim / Sarah Mitchell / Ravi Kumar / Omar Saeed etc.).
//
// These rows were demo data written into a compliance ledger. THEY MUST NOT STAY.
// This script only removes the exact seeded tuples — real entries are never touched.
//
// USAGE
//   npx tsx db/cleanup-audit-actors.ts            # dry run: report what would be removed
//   npx tsx db/cleanup-audit-actors.ts --apply    # perform the deletion
//
// ORDER IS IMPORTANT (operator): run this cleanup FIRST, then apply the new schema.sql
// which (a) no longer seeds audit_log and (b) installs the append-only trigger that
// forbids future UPDATE/DELETE on the ledger.
import "dotenv/config";
import { Client } from "pg";

const url = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/developer_inventory";

const SEEDED = [
  ["Khalid Al Fahim", "CEO", "Approved", "BLG III · Discount request", false],
  ["Sarah Mitchell", "Sales Dir", "Created", "BLG III · Lead", false],
  ["Ravi Kumar", "Finance Mgr", "Updated", "H21 · Receipt RCP-H21-004789", false],
  ["Ravi Kumar", "Finance Mgr", "Created", "DDR-0004", false],
  ["Khalid Al Fahim", "CEO", "Approved", "WPK · Phase 2 release", false],
  ["Sarah Mitchell", "Sales Dir", "Updated", "BLG III · Price list", true],
  ["Omar Saeed", "Project Mgr", "Created", "BLG III · Snag SNG-0412", false],
  ["Ravi Kumar", "Finance Mgr", "Exported", "Finance · Statement", true],
  ["Khalid Al Fahim", "CEO", "Updated", "System · User", true],
  ["Sarah Mitchell", "Sales Dir", "Created", "BLG III · Booking BK-9042", false],
  ["Ravi Kumar", "Finance Mgr", "Updated", "Escrow · Reconciliation", false],
  ["Omar Saeed", "Project Mgr", "Updated", "WPK · Milestone", false],
].map(([actor, role, action, object, sensitive]) => ({ actor, role, action, object, sensitive }));

async function main() {
  const apply = process.argv.includes("--apply");
  const c = new Client({ connectionString: url });
  await c.connect();

  try {
    // Safety: refuse to delete when the append-only trigger is already present.
    const tg = await c.query(
      "SELECT count(*)::int AS n FROM pg_trigger WHERE tgname = 'trg_audit_log_append_only'"
    );
    if (tg.rows[0].n > 0) {
      console.error(
        "ABORT: append-only trigger already installed on audit_log — deletion would be rejected anyway. " +
          "Nothing to do."
      );
      process.exit(1);
    }

    const params: any[] = [];
    const conds = SEEDED.map((s, i) => {
      const o = i * 5;
      params.push(s.actor, s.role, s.action, s.object, s.sensitive);
      return `(actor = $${o + 1} AND role = $${o + 2} AND action = $${o + 3} AND object = $${o + 4} AND sensitive = $${o + 5})`;
    });
    const where = conds.join(" OR ");

    const sel = await c.query(
      `SELECT id, ts, actor, action, object, field, before_val, after_val FROM audit_log WHERE ${where} ORDER BY id`,
      params
    );
    console.log(`Seeded rows matched: ${sel.rows.length}`);

    for (const r of sel.rows) {
      console.log(`  #${r.id}  ${r.actor}  ${r.action}  ${r.object}  (${r.ts.toISOString?.() || String(r.ts)})`);
    }

    if (!apply) {
      console.log("\nDry run — nothing changed. Re-run with --apply to delete these rows.");
      process.exit(0);
    }

    const del = await c.query(`DELETE FROM audit_log WHERE ${where}`, params);
    console.log(`Deleted ${del.rowCount} seeded rows.`);
  } catch (e: any) {
    console.error("Failed:", e?.message || e);
    process.exit(1);
  } finally {
    await c.end();
  }
}

main();