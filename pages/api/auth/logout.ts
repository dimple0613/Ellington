import type { NextApiRequest, NextApiResponse } from "next";
import { serializeCookie } from "../../../lib/session";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const clear = (name: string) =>
    serializeCookie(name, "", { path: "/", httpOnly: true, maxAge: 0, sameSite: "lax" });
  res.setHeader("Set-Cookie", [clear("session"), clear("__Host-session")]);
  return res.status(200).json({ ok: true });
}
