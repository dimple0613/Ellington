export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";

export default function handler(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", {
    path: "/",
    httpOnly: true,
    maxAge: 0,
    sameSite: "lax",
  });
  return res;
}
