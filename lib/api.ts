import type { NextApiResponse } from "next";

export type ApiEnvelope<T = unknown> = { ok: boolean; data: T; error: string | null };

export function ok<T>(res: NextApiResponse, data: T, status = 200) {
  res.status(status).json({ ok: true, data, error: null });
}

export function fail(res: NextApiResponse, message: string, status = 400) {
  res.status(status).json({ ok: false, data: null, error: message });
}

export function methodNotAllowed(res: NextApiResponse) {
  return fail(res, "Method not allowed", 405);
}

export function notFound(res: NextApiResponse, message: string) {
  return fail(res, message, 404);
}

export function validEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function missingFields(body: Record<string, unknown>, keys: string[]): string | null {
  const absent = keys.filter((k) => {
    const v = body[k];
    return v === undefined || v === null || v === "";
  });
  if (absent.length === 0) return null;
  if (absent.length === 1) return `${absent[0]} is required`;
  return `${absent.slice(0, -1).join(", ")} and ${absent[absent.length - 1]} are required`;
}