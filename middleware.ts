import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const status = process.env.NEXT_PUBLIC_SITE_STATUS; 
  const url = request.nextUrl.clone();
  const COOKIE_NAME = "oxy_admin";

  // 1. SECRET BYPASS
  if (request.nextUrl.searchParams.get('preview') === 'true') {
    return NextResponse.next();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // A. NEW: ADMIN API GATEKEEPER (The Security Fix)
  // ──────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────
  // A. UPDATED: ADMIN API GATEKEEPER
  // ──────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin')) {
    // 🛡️ EXCEPTION: Allow the login API to pass through!
    if (pathname === '/api/admin/login') {
      return NextResponse.next();
    }

    const adminCookie = request.cookies.get(COOKIE_NAME);
    if (adminCookie?.value !== '1') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 401 }
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // B. SITE STATUS LOGIC (Maintenance & Coming Soon)
  // ──────────────────────────────────────────────────────────────────────────
  const isInternalPath = pathname.startsWith('/admin') || 
                         pathname.startsWith('/api') || 
                         pathname.startsWith('/_next');

  if (!isInternalPath) {
    if (status === "MAINTENANCE" && !pathname.startsWith('/maintenance')) {
      url.pathname = '/maintenance';
      return NextResponse.rewrite(url);
    }
    if (status === "COMING_SOON" && !pathname.startsWith('/coming-soon')) {
      url.pathname = '/coming-soon';
      return NextResponse.rewrite(url);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // C. ADMIN UI AUTH LOGIC
  // ──────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const adminToken = request.cookies.get(COOKIE_NAME);
    if (!adminToken || adminToken.value !== "1") {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// ──────────────────────────────────────────────────────────────────────────
// D. UPDATED MATCHER (Protects everything except assets)
// ──────────────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    /*
     * This matcher now includes /api/admin paths while excluding static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.JPG|.*\\.png).*)',
  ],
};