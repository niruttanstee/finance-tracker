import { NextResponse } from 'next/server';
import { 
  getMonthlySpending, 
  getCategoryBreakdown, 
  getUncategorizedCount,
  getTransactions 
} from '@/lib/transactions';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export async function GET() {
  try {
    // Get current and previous month totals
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthTransactions = await getTransactions({
      startDate: currentMonthStart,
      endDate: currentMonthEnd,
      type: 'DEBIT',
    });

    const lastMonthTransactions = await getTransactions({
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      type: 'DEBIT',
    });

    const currentMonthTotal = currentMonthTransactions.reduce(
      (sum, t) => sum + t.amount, 
      0
    );

    const lastMonthTotal = lastMonthTransactions.reduce(
      (sum, t) => sum + t.amount, 
      0
    );

    const percentChange = lastMonthTotal > 0
      ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
      : 0;

    // Get monthly spending chart data
    const monthlySpending = await getMonthlySpending(6);

    // Get category breakdown
    const categoryBreakdown = await getCategoryBreakdown(
      currentMonthStart,
      currentMonthEnd
    );

    // Get uncategorized count
    const uncategorizedCount = await getUncategorizedCount();

    return NextResponse.json({
      currentMonthTotal,
      lastMonthTotal,
      percentChange,
      monthlySpending,
      categoryBreakdown,
      uncategorizedCount,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
}
