import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from './lib/db';
import { sessions } from './lib/schema';
import { eq, and, gt } from 'drizzle-orm';
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

  // Verify HMAC signature
  const sessionId = verifySessionCookie(cookieValue);
  if (!sessionId) {
    const response = NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Look up session in DB
  const now = new Date();
  let session;
  try {
    [session] = await db
      .select()
      .from(sessions)
      .where(and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, now)
      ))
      .limit(1);
  } catch (err) {
    console.error('Session DB error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session) {
    const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Attach userId to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*'],
};
