import { NextRequest, NextResponse } from 'next/server';
import { verifySessionTokenDetailed, SESSION_COOKIE_NAME } from './core/application/auth/session';

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

function extractSessionCookie(request: NextRequest): { token?: string; source: 'cookies' | 'header' | 'none' } {
  const fromCookies = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (fromCookies) {
    return { token: fromCookies, source: 'cookies' };
  }

  const rawCookie = request.headers.get('cookie');
  if (rawCookie) {
    const match = rawCookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`));
    if (match && match[1]) {
      return { token: decodeURIComponent(match[1].trim()), source: 'header' };
    }
  }

  return { source: 'none' };
}

// Security headers helper
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  return response;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  // 1. Public metadata & Machine-to-Machine Home Assistant routes: EXCLUDED from human session auth
  // - robots.txt / favicon.ico: public with security & noindex headers
  // - Home Assistant: dedicated Bearer token verification in route handlers
  if (pathname === '/robots.txt' || pathname === '/favicon.ico') {
    return applySecurityHeaders(NextResponse.next());
  }

  if (pathname.startsWith('/api/integrations/home-assistant/')) {
    return applySecurityHeaders(NextResponse.next());
  }

  // 2. Check session validity (fail-closed if AUTH_SECRET is not configured)
  const cookieExtraction = extractSessionCookie(request);
  const cookiePresent = Boolean(cookieExtraction.token);
  const verification = await verifySessionTokenDetailed(cookieExtraction.token);
  const isAuthenticated = verification.valid;

  const host = request.headers.get('host') || request.nextUrl.host;
  const xForwardedHost = request.headers.get('x-forwarded-host');

  // Diagnostic logging for session tracking (ATP-AUTH-003: strictly NO sensitive data/cookies logged)
  if (
    pathname.startsWith('/plants/') ||
    pathname.startsWith('/inventory') ||
    pathname === '/login' ||
    pathname === '/'
  ) {
    console.log('[Auth:SessionCheck]', {
      pathname,
      host,
      xForwardedHost,
      cookiePresent,
      cookieSource: cookieExtraction.source,
      hasRawCookieHeader: Boolean(request.headers.get('cookie')),
      cookieLength: cookieExtraction.token ? cookieExtraction.token.length : 0,
      sessionValid: isAuthenticated,
      verificationReason: verification.reason,
      tokenExp: verification.exp ?? null,
      timeRemainingSec: verification.exp && verification.now ? verification.exp - verification.now : null,
      userAgent: (request.headers.get('user-agent') || '').slice(0, 100),
    });
  }

  // 3. Login page handling
  if (pathname === '/login') {
    if (isAuthenticated) {
      // Already authenticated, redirect to home/dashboard
      const redirectUrl = new URL('/', request.url);
      return applySecurityHeaders(NextResponse.redirect(redirectUrl));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // 4. Internal API routes protection (Return 401 JSON for APIs)
  if (
    pathname.startsWith('/api/integrations/plantbook/') ||
    pathname.startsWith('/api/photos/')
  ) {
    if (!isAuthenticated) {
      return applySecurityHeaders(
        NextResponse.json({ error: 'No autorizado. Se requiere iniciar sesión.' }, { status: 401 })
      );
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // 5. All other routes (UI screens): require human authentication
  if (!isAuthenticated) {
    if (pathname.includes('/edit') && pathname.startsWith('/plants/')) {
      const userAgent = request.headers.get('user-agent') || '';
      console.log('[Proxy:EditRouteUnauthorized]', {
        pathname,
        host,
        cookiePresent,
        verificationReason: verification.reason,
        nextRouterPrefetch: request.headers.get('next-router-prefetch'),
        purpose: request.headers.get('purpose'),
        secPurpose: request.headers.get('sec-purpose'),
        rsc: request.headers.get('rsc'),
        hasStateTree: Boolean(request.headers.get('next-router-state-tree')),
        secFetchMode: request.headers.get('sec-fetch-mode'),
        secFetchDest: request.headers.get('sec-fetch-dest'),
        secFetchSite: request.headers.get('sec-fetch-site'),
        userAgent: userAgent.slice(0, 100),
      });
    }

    // Check if request is an internal Next.js prefetch or browser speculative prefetch
    const isPrefetch =
      request.headers.get('next-router-prefetch') === '1' ||
      request.headers.get('purpose') === 'prefetch' ||
      request.headers.get('sec-purpose')?.includes('prefetch') ||
      request.headers.get('sec-purpose')?.includes('prerender');
    const isRSC =
      request.headers.get('rsc') === '1' ||
      request.headers.get('accept')?.includes('text/x-component') === true ||
      Boolean(request.headers.get('next-router-state-tree'));

    // For background prefetches without an active session:
    // Return empty 204 No Content so Next.js router or browser drops the prefetch cleanly
    // instead of receiving a 307 HTML redirect that breaks React hydration/render tree.
    if (isPrefetch) {
      return applySecurityHeaders(new NextResponse(null, { status: 204 }));
    }

    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('from', `${pathname}${search}`);
    }

    // For active RSC requests (in-app client navigation):
    // Instruct the Next.js App Router to perform a full redirect
    if (isRSC) {
      const rscRedirectResponse = new NextResponse(null, { status: 200 });
      rscRedirectResponse.headers.set('x-middleware-redirect', loginUrl.toString());
      return applySecurityHeaders(rscRedirectResponse);
    }

    // Standard human browser document navigation: 307 redirect
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return applySecurityHeaders(NextResponse.next());
}

export { proxy as middleware };
