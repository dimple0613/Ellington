import { neon } from "@neondatabase/serverless";

type CloudflareEnv = {
  HYPERDRIVE?: { connectionString: string };
  [key: string]: unknown;
};

function getHyperdriveConnection(): string | null {
  // OpenNext stores the request-scoped runtime env under a global symbol set in
  // .open-next/cloudflare/init.js at runtime. Hyperdrive bindings are objects
  // (not strings), so they are not copied into process.env; read them directly.
  try {
    const ctx = (globalThis as any)[Symbol.for("__cloudflare-context__")];
    const env: CloudflareEnv | undefined = ctx?.env;
    const cs = env?.HYPERDRIVE?.connectionString;
    if (typeof cs === "string" && cs.length > 0) return cs;
  } catch {
    // Not running in a Cloudflare worker context.
  }
  return null;
}

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
  // Priority: Hyperdrive binding (Cloudflare Worker) -> DATABASE_URL env.
  const connectionString = getHyperdriveConnection() || process.env.DATABASE_URL;
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

type Tx = {
  query: <T extends Record<string, any> = any>(text: string, params?: any[]) => Promise<{ rows: T[] }>;
};

export async function withTransaction<T>(fn: (q: Tx) => Promise<T>): Promise<T> {
  const connectionString = getHyperdriveConnection() || process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  if (!isNeon(connectionString)) {
    const { Client } = await import("pg");
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await client.query("BEGIN");
      const result = await fn({
        query: async (text, params) => {
          const r = await client.query(text, params ?? []);
          return { rows: r.rows };
        },
      });
      await client.query("COMMIT");
      return result;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      await client.end();
    }
  }

  // Neon fallback (only used when deployed without Hyperdrive): each statement is an HTTP
  // round-trip, so wrap BEGIN/COMMIT as plain statements on the shared connection.
  const sql = neon(connectionString);
  await sql.query("BEGIN");
  try {
    const result = await fn({
      query: async (text, params) => {
        const r = await sql.query(text, params ?? []);
        return { rows: r as any[] };
      },
    });
    await sql.query("COMMIT");
    return result;
  } catch (e) {
    await sql.query("ROLLBACK").catch(() => {});
    throw e;
  }
}
