import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard';
import { getUncategorizedCount } from '@/lib/transactions';
import { db } from '@/lib/db';
import { sessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifySessionCookie, COOKIE_NAME } from '@/lib/auth/session';
import { format } from 'date-fns';

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

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');

    // Default to current month if not specified
    const targetMonth = month || format(new Date(), 'yyyy-MM');

    const [data, uncategorizedCount] = await Promise.all([
      getDashboardData(targetMonth, userId),
      getUncategorizedCount(userId),
    ]);

    return NextResponse.json({
      ...data,
      uncategorizedCount,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
