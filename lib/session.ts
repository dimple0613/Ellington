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

export async function sign(payload: Omit<Session, "exp"> & { exp?: number }): Promise<string> {
  const SECRET = (globalThis as any).process?.env?.JWT_SECRET || "dev-secret-change-me";
  const exp = payload.exp ?? Date.now() + 86400000;
  const body = btoa(JSON.stringify({ ...payload, exp }));
  const sig = await hmacSign(body, SECRET);
  return `${body}.${sig}`;
}

export async function verify(token: string | undefined | null): Promise<Session | null> {
  if (!token) return null;
  const SECRET = (globalThis as any).process?.env?.JWT_SECRET || "dev-secret-change-me";
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

function parseCookies(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = rest.join("=");
  }
  return out;
}

export function withSession(
  handler: (req: any, res: any) => void | Promise<void>
) {
  return async (req: any, res: any) => {
    const cookieHeader = req.headers?.cookie || "";
    const cookies = parseCookies(cookieHeader);
    const session = await verify(cookies.session);
    if (!session) return res.status(401).json({ error: "Not signed in" });
    return handler({ ...req, session }, res);
  };
}
