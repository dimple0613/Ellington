import "dotenv/config";
import { Client } from "pg";

const url = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/developer_inventory";

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  const tables = [
    "escrow_ledger", "payment_milestones", "receipts", "leads",
    "units", "buyers", "projects", "admins",
  ];
  for (const t of tables) {
    await client.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
  await client.end();
  console.log("reset ok");
}
main().catch((e) => { console.error(e); process.exit(1); });