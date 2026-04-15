import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifySessionCookie, COOKIE_NAME } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  // Read cookie directly (middleware may not set x-session-id for direct API calls)
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify HMAC signature
  const sessionId = await verifySessionCookie(cookieValue);
  if (!sessionId) {
    const response = NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Check session exists and is not expired (Node.js runtime DB access)
  const now = new Date();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt <= now) {
    const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const [user] = await db
    .select({ id: users.id, username: users.username, role: users.role })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
