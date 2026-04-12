import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard';
import { getUncategorizedCount } from '@/lib/transactions';
import { getUserIdFromRequest } from '@/lib/auth/api';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request);
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
