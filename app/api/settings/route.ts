import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings, sessions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { verifySessionCookie, COOKIE_NAME } from '@/lib/auth/session';

async function getUserIdFromCookie(request: NextRequest): Promise<string | null> {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) return null;

  const sessionId = await verifySessionCookie(cookieValue);
  if (!sessionId) return null;

  const now = new Date();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt <= now) return null;
  return session.userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.query.settings.findFirst({
      where: and(eq(settings.id, 'app_settings'), eq(settings.userId, userId)),
    });
    return NextResponse.json({
      data: result || { id: 'app_settings', apiProvider: null, apiKey: null },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiProvider, apiKey } = await request.json();
    const now = new Date();

    await db
      .insert(settings)
      .values({ id: 'app_settings', apiProvider, apiKey, createdAt: now, updatedAt: now, userId })
      .onConflictDoUpdate({
        target: [settings.id, settings.userId],
        set: { apiProvider, apiKey, updatedAt: now },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
