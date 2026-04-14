import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/schema';
import { eq, and, gt } from 'drizzle-orm';

/**
 * Get authenticated userId from request headers.
 * Must be called from Node.js runtime (API routes), not Edge runtime.
 * Middleware sets x-session-id header after cryptographic verification.
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const sessionId = request.headers.get('x-session-id');
  if (!sessionId) return null;

  const now = new Date();
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(
      eq(sessions.id, sessionId),
      gt(sessions.expiresAt, now)
    ))
    .limit(1);

  return session?.userId ?? null;
}

