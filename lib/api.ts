import type { NextApiResponse } from "next";

export type ApiEnvelope<T = unknown> = { ok: boolean; data: T; error: string | null };

function noCache(res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
}

export function ok<T>(res: NextApiResponse, data: T, status = 200) {
  noCache(res);
  res.status(status).json({ ok: true, data, error: null });
}

export function fail(res: NextApiResponse, message: string, status = 400) {
  noCache(res);
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

export async function fetchJSON<T = unknown>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(path, opts);
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  const json = await res.json().catch(() => null);
  if (json && typeof json === "object" && "ok" in json) {
    if (!(json as { ok: boolean }).ok) throw new Error((json as { error: string | null }).error || "Request failed");
    return (json as { data: T }).data ?? (null as T);
  }
  if (!res.ok) throw new Error("Request failed");
  return json as T;
}