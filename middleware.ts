import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";
import { verifyFromCookieHeader } from "./lib/session";
import { roleHasPerm, type PermModule } from "./lib/permission-map";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/project",
  "/inventory",
  "/sales",
  "/finance",
  "/handover",
  "/system",
  "/mobile",
  "/profile",
];

// Route group -> module the user must be able to READ to access the page.
// /profile stays auth-only (it is the user's own account).
const ROUTE_MODULE: Record<string, PermModule> = {
  "/dashboard": "Dashboard",
  "/project": "Inventory",
  "/inventory": "Inventory",
  "/sales": "Sales",
  "/finance": "Finance",
  "/handover": "Handover",
  "/system": "Settings",
  "/mobile": "Dashboard",
};

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

  if (session && isProtected) {
    const module = ROUTE_MODULE[pathname];
    if (module) {
      if (!roleHasPerm(session.role, module, "REA")) {
        // Authenticated but lacks read access to this module -> forbidden.
        const url = req.nextUrl.clone();
        url.pathname = "/403";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
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