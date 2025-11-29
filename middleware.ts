import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the login page itself without auth
  if (pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  // For all other /admin pages, require cookie
  const adminCookie = req.cookies.get("oxy_admin")?.value;

  if (!adminCookie || adminCookie !== "1") {
    const loginUrl = new URL("/admin/login", req.url);
    // optional: keep where user tried to go
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Only run on /admin routes (NOT on /api)
export const config = {
  matcher: ["/admin/:path*"],
};
