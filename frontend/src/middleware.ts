import { NextRequest, NextResponse } from "next/server";

// Auth routes (never require a session)
const PUBLIC_PATHS = new Set(["/login", "/register", "/forgot-password", "/onboarding", "/pending-approval"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Pass-through for Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has("sq_auth");

  // Root: redirect based on auth state
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(hasSession ? "/dashboard" : "/login", req.url)
    );
  }

  // Auth routes: if already authed, go straight to dashboard
  if (PUBLIC_PATHS.has(pathname)) {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Everything else is a protected (app) route
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except Next.js internals and static files
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
