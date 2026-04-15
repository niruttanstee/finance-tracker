import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookie, COOKIE_NAME } from './lib/auth/session';

const PUBLIC_PATHS = ['/api/auth/login'];
const PROTECTED_PREFIXES = ['/api/', '/finance'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth endpoints
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow non-protected routes (e.g., root `/` launcher)
  if (!PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Extract session cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) {
    // For page requests, redirect to login; for API, return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Verify HMAC signature
  const sessionId = await verifySessionCookie(cookieValue);
  if (!sessionId) {
    if (pathname.startsWith('/api')) {
      const response = NextResponse.json({ error: 'Invalid session' }, { status: 401 });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Attach sessionId to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-session-id', sessionId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).)*'],
};
