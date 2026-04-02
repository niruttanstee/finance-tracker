import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard';
import { getCurrentBalance } from '@/lib/balance';
import { getUncategorizedCount } from '@/lib/transactions';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    
    // Default to current month if not specified
    const targetMonth = month || format(new Date(), 'yyyy-MM');
    
    const [data, balance, uncategorizedCount] = await Promise.all([
      getDashboardData(targetMonth),
      getCurrentBalance(),
      getUncategorizedCount(),
    ]);
    
    return NextResponse.json({
      ...data,
      availableFunds: balance.balance,
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
