import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function query<T extends Record<string, any> = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[] }> {
  const result = await sql.query(text, params ?? []);
  return { rows: result as T[] };
}
