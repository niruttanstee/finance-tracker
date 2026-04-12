import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookie, COOKIE_NAME } from './lib/auth/session';

const PUBLIC_PATHS = ['/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth endpoints without session
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow non-API routes (pages, static assets)
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Extract session cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify HMAC signature (cryptographic only - no DB in Edge runtime)
  const sessionId = await verifySessionCookie(cookieValue);
  if (!sessionId) {
    const response = NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Attach sessionId to request headers for API routes to look up in DB
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-session-id', sessionId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*'],
};
