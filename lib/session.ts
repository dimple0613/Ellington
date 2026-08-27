import crypto from "crypto";
import { NextApiRequest, NextApiResponse } from "next";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export type Session = {
  userId: number;
  email: string;
  role: string;
  exp: number;
};

function parseCookies(req: NextApiRequest): Record<string, string> {
  const header = req.headers.cookie || "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k] = rest.join("=");
  }
  return out;
}

export function sign(payload: Omit<Session, "exp"> & { exp?: number }): string {
  const exp = payload.exp ?? Date.now() + 86400000;
  const body = Buffer.from(JSON.stringify({ ...payload, exp }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verify(token: string | undefined | null): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function withSession(
  handler: (req: NextApiRequest & { session: Session }, res: NextApiResponse) => void | Promise<void>
) {
  return (req: NextApiRequest, res: NextApiResponse) => {
    const cookies = parseCookies(req);
    const session = verify(cookies.session);
    if (!session) return res.status(401).json({ error: "Not signed in" });
    return handler(req as NextApiRequest & { session: Session }, res);
  };
}