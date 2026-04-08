import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.query.settings.findFirst({
      where: eq(settings.id, 'app_settings'),
    });
    return NextResponse.json({
      data: result || { id: 'app_settings', apiProvider: null, apiKey: null },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { apiProvider, apiKey } = await request.json();
    const now = new Date();

    await db
      .insert(settings)
      .values({ id: 'app_settings', apiProvider, apiKey, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.id,
        set: { apiProvider, apiKey, updatedAt: now },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
