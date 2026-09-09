import "dotenv/config";
import { Client } from "pg";

const url = process.env.DATABASE_URL || "postgresql://postgres@localhost:5432/developer_inventory";

async function main() {
  const client = new Client({ connectionString: url });
  await client.connect();
  const tables = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
  );
  for (const { tablename } of tables.rows) {
    await client.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
  }
  await client.end();
  console.log(`reset ok (${tables.rows.length} tables dropped)`);
}
main().catch((e) => { console.error(e); process.exit(1); });