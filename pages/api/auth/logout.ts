import type { NextApiRequest, NextApiResponse } from "next";
import { serializeCookie } from "../../../lib/session";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie("session", "", { path: "/", httpOnly: true, maxAge: 0, sameSite: "lax" })
  );
  return res.status(200).json({ ok: true });
}
