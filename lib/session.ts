import type { NextApiRequest, NextApiResponse } from "next";

export type Session = {
  userId: number;
  email: string;
  role: string;
  exp: number;
};

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

const SECRET_DEFAULT = "dev-secret-change-me";

export async function sign(payload: Omit<Session, "exp"> & { exp?: number }): Promise<string> {
  const SECRET = process.env.JWT_SECRET || SECRET_DEFAULT;
  const exp = payload.exp ?? Date.now() + 86400000;
  const body = btoa(JSON.stringify({ ...payload, exp }));
  const sig = await hmacSign(body, SECRET);
  return `${body}.${sig}`;
}

export async function verify(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const SECRET = process.env.JWT_SECRET || SECRET_DEFAULT;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = await hmacSign(body, SECRET);
  if (sig !== expectedSig) return null;
  try {
    const payload = JSON.parse(atob(body)) as Session;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(req: NextApiRequest): Record<string, string> {
  const out: Record<string, string> = {};
  const header = req.headers.cookie;
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; httpOnly?: boolean; path?: string; sameSite?: "lax" | "strict" | "none" } = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.path) parts.push(`Path=${opts.path}`);
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join("; ");
}

export function withSession<
  R extends NextApiRequest,
  S extends NextApiResponse
>(
  handler: (req: R, res: S, session: Session) => void | Promise<void>
) {
  return async (req: R, res: S): Promise<void> => {
    const cookies = parseCookies(req);
    const session = await verify(cookies["session"]);
    if (!session) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    await handler(req, res, session);
  };
}
