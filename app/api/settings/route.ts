import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
import { getUserIdFromRequest } from '@/lib/auth/api';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
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
    const userId = await getUserIdFromRequest(request);
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
