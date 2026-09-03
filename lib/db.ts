import { neon } from "@neondatabase/serverless";

export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const sql = neon(connectionString);
  const result = await sql.query(text, params ?? []);
  return { rows: result as T[] };
}
