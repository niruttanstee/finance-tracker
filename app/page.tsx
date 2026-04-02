'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SyncButton } from './components/SyncButton';
import { CategoryBreakdown } from './components/charts/CategoryBreakdown';
import { SavingsRate } from './components/charts/SavingsRate';
import { format, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';

interface DashboardData {
  month: string;
  spending: number;
  income: number;
  savings: number;
  savingsRate: number;
  categoryBreakdown: { category: string; amount: number; color: string }[];
  monthlyTrend: { month: string; spending: number; income: number; savings: number }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const selectedMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM');
  
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/dashboard?month=${selectedMonth}`);
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [selectedMonth]);
  
  function navigateMonth(direction: 'prev' | 'next') {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const params = new URLSearchParams(searchParams);
    params.set('month', newYearMonth);
    router.push(`/?${params.toString()}`);
  }
  
  function formatMonthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  
  // Calculate comparison with previous month
  const previousMonth = format(subMonths(parseISO(selectedMonth + '-01'), 1), 'yyyy-MM');
  const previousMonthData = data?.monthlyTrend.find(d => d.month === previousMonth);
  const spendingChange = previousMonthData && data
    ? ((data.spending - previousMonthData.spending) / previousMonthData.spending) * 100
    : 0;
  
  if (loading) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Finance Tracker</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </main>
    );
  }
  
  if (!data) {
    return (
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Finance Tracker</h1>
            <p className="text-muted-foreground">Failed to load data</p>
          </div>
        </div>
      </main>
    );
  }
  
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

      {/* Month Navigation - Budget Page Style */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold min-w-[200px] text-center">
          {formatMonthLabel(selectedMonth)}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Spending
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {data.spending.toFixed(2)}
            </div>
            <p className={`text-xs ${
              spendingChange > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {spendingChange > 0 ? '+' : ''}{spendingChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Income
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {data.income.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Savings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {data.savings.toFixed(2)}
            </div>
            <p className={`text-xs ${
              data.savingsRate >= 20 ? 'text-green-600' : 'text-yellow-600'
            }`}>
              {data.savingsRate.toFixed(1)}% savings rate
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
            <CardTitle>Savings Rate Trend</CardTitle>
            <CardDescription>Income vs Spending vs Savings Rate</CardDescription>
          </CardHeader>
          <CardContent>
            <SavingsRate data={data.monthlyTrend} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy')} breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryBreakdown data={data.categoryBreakdown} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
