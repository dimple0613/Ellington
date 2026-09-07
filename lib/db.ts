import { neon } from "@neondatabase/serverless";

const isNeon = (connectionString: string) => {
  try {
    const host = new URL(connectionString).hostname;
    return host.endsWith(".neon.tech") || host === "neon.tech";
  } catch {
    return false;
  }
};

export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  // Local Postgres (dev/test): use the node pg driver. Neon cloud (edge via OpenNext/Cloudflare):
  // use the serverless driver. Chosen by host so deployed behavior is unchanged.
  if (!isNeon(connectionString)) {
    const { Client } = await import("pg");
    const client = new Client({ connectionString });
    try {
      await client.connect();
      const result = await client.query(text, params ?? []);
      return { rows: result.rows as T[] };
    } finally {
      await client.end();
    }
  }

  const sql = neon(connectionString);
  const result = await sql.query(text, params ?? []);
  return { rows: result as T[] };
}
