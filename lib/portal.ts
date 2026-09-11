import type { NextApiRequest, NextApiResponse } from "next";
import { serializeCookie, sign, verify } from "./session";

export type PortalKind = "buyer" | "broker";

export type PortalSession = {
  kind: PortalKind;
  id: number;
  email: string;
  name: string;
  exp: number;
};

export const PORTAL_COOKIE = "portal";

export async function signPortal(session: Omit<PortalSession, "exp">): Promise<string> {
  return sign({ ...session, exp: Date.now() + 6 * 3600000 } as any);
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

export async function getPortalSession(
  req: NextApiRequest,
  kind: PortalKind
): Promise<PortalSession | null> {
  const raw = parseCookies(req)[PORTAL_COOKIE];
  if (!raw) return null;
  const s = (await verify(raw)) as unknown as PortalSession | null;
  if (!s || s.kind !== kind || !s.id) return null;
  return s;
}

export function clearPortalCookie(res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(PORTAL_COOKIE, "", { path: "/", httpOnly: true, maxAge: 0, sameSite: "lax" })
  );
}

export function setPortalCookie(res: NextApiResponse, token: string) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(PORTAL_COOKIE, token, {
      path: "/",
      httpOnly: true,
      maxAge: 6 * 3600,
      sameSite: "lax",
    })
  );
}

export function withPortalSession(
  kind: PortalKind,
  handler: (req: NextApiRequest, res: NextApiResponse, session: PortalSession) => void | Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
    const session = await getPortalSession(req, kind);
    if (!session) {
      res.status(401).json({ ok: false, data: null, error: "Not signed in" });
      return;
    }
    await handler(req, res, session);
  };
}