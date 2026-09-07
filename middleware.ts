import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { verifyFromCookieHeader } from "./lib/session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/project",
  "/inventory",
  "/sales",
  "/finance",
  "/handover",
  "/system",
  "/mobile",
];

const PUBLIC_ONLY_PREFIXES = ["/login", "/forgot-password", "/reset-password"];

function isInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !/^\/[^:]*:/.test(path);
}

function safeNext(raw: string | null): string {
  if (raw && isInternalPath(raw)) return raw;
  return "/dashboard";
}

export async function middleware(req: NextRequest, _event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const session = await verifyFromCookieHeader(req.headers.get("cookie"));
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isPublicOnly = PUBLIC_ONLY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isProtected && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }

  if (isPublicOnly && session) {
    const url = req.nextUrl.clone();
    const dest = safeNext(req.nextUrl.searchParams.get("next"));
    url.pathname = dest;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};