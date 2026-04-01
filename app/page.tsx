import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SyncButton } from './components/SyncButton';
import { MonthlySpending } from './components/charts/MonthlySpending';
import { CategoryBreakdown } from './components/charts/CategoryBreakdown';
import { getMonthlySpending, getCategoryBreakdown, getUncategorizedCount, getTransactions } from '@/lib/transactions';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export default async function DashboardPage() {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  // Fetch all data in parallel
  const [
    monthlySpending,
    categoryBreakdown,
    uncategorizedCount,
    currentMonthTransactions,
    lastMonthTransactions,
  ] = await Promise.all([
    getMonthlySpending(6),
    getCategoryBreakdown(currentMonthStart, currentMonthEnd),
    getUncategorizedCount(),
    getTransactions({
      startDate: currentMonthStart,
      endDate: currentMonthEnd,
      type: 'DEBIT',
    }),
    getTransactions({
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      type: 'DEBIT',
    }),
  ]);

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

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Finance Tracker</h1>
          <p className="text-muted-foreground">
            Track your spending and manage your finances
          </p>
        </div>
        <SyncButton />
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Month Spending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {currentMonthTotal.toFixed(2)}
            </div>
            <p className={`text-xs ${
              percentChange > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Uncategorized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uncategorizedCount}</div>
            <p className="text-xs text-muted-foreground">
              transactions need categorization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/transactions">
              <Button className="w-full">View All Transactions</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
            <CardDescription>Last 6 months trend</CardDescription>
          </CardHeader>
          <CardContent>
            <MonthlySpending data={monthlySpending} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Current month breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown data={categoryBreakdown} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
