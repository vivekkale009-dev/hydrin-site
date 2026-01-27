import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const status = process.env.NEXT_PUBLIC_SITE_STATUS; // "LIVE", "COMING_SOON", or "MAINTENANCE"
  const url = request.nextUrl.clone();

  // 1. SECRET BYPASS: Visit yoursite.in/?preview=true to bypass redirects
  if (request.nextUrl.searchParams.get('preview') === 'true') {
    return NextResponse.next();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // A. SITE STATUS LOGIC (Maintenance & Coming Soon)
  // ──────────────────────────────────────────────────────────────────────────

  // Ignore status checks for Admin and API routes so you don't lock yourself out
  const isInternalPath = pathname.startsWith('/admin') || 
                         pathname.startsWith('/api') || 
                         pathname.startsWith('/_next');

  if (!isInternalPath) {
    // Maintenance Mode
    if (status === "MAINTENANCE" && !pathname.startsWith('/maintenance')) {
      url.pathname = '/maintenance';
      return NextResponse.rewrite(url);
    }

    // Coming Soon Mode
    if (status === "COMING_SOON" && !pathname.startsWith('/coming-soon')) {
      url.pathname = '/coming-soon';
      return NextResponse.rewrite(url);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // B. YOUR EXISTING ADMIN AUTH LOGIC
  // ──────────────────────────────────────────────────────────────────────────
  const COOKIE_NAME = "oxy_admin";

  if (pathname.startsWith('/admin')) {
    // Allow login page
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const adminToken = request.cookies.get(COOKIE_NAME);

    // If cookie is missing or not "1", kick back to login
    if (!adminToken || adminToken.value !== "1") {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Updated Matcher to allow search engines to read sitemap and robots files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sitemap.xml and robots.txt (SEO files)
     * - Images like EarthyLogo.JPG or PNGs
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.JPG|.*\\.png).*)',
  ],
};