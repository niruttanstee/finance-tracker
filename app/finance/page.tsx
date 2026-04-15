'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { SyncButton } from '@/app/components/SyncButton';
import { CategoryBreakdown } from '@/app/components/charts/CategoryBreakdown';
import { CategorySpendingTrend } from '@/app/components/charts/CategorySpendingTrend';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, ArrowDownRight, Wallet, Tag, TrendingUp } from 'lucide-react';

interface DashboardData {
  month: string;
  spending: number;
  savings: number;
  availableFunds: number;
  uncategorizedCount: number;
  categoryBreakdown: { category: string; amount: number; color: string }[];
  categorySpendingTrend: { month: string; [category: string]: number | string }[];
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ name: string; color: string }[]>([]);
  const [hasWiseToken, setHasWiseToken] = useState(false);
  const [syncKey, setSyncKey] = useState(0);

  const selectedMonth = searchParams.get('month') || format(new Date(), 'yyyy-MM');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [dashboardResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/dashboard?month=${selectedMonth}`),
          fetch('/api/categories'),
        ]);

        // Redirect to login if not authenticated
        if (dashboardResponse.status === 401) {
          router.push('/');
          return;
        }

        const dashboardData = await dashboardResponse.json();
        const categoriesData = await categoriesResponse.json();
        const settingsResponse = await fetch('/api/settings');
        const settingsData = await settingsResponse.json();

        // Only set data if it's a valid response (not an error)
        if (dashboardData && !dashboardData.error) {
          setData(dashboardData);
        }
        if (categoriesData?.data && !categoriesData.error) {
          setCategories(categoriesData.data.map((c: { name: string; color: string }) => ({ name: c.name, color: c.color })));
        }
        setHasWiseToken(settingsData.data?.apiProvider === 'wise' && !!settingsData.data?.apiKey);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedMonth, syncKey, router]);

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
        <SyncButton mode={hasWiseToken ? 'wise' : 'upload'} onSync={() => setSyncKey(k => k + 1)} />
      </div>

      {/* Month Navigation - Budget Page Style */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          className="p-2 rounded-md border hover:bg-gray-100"
          onClick={() => navigateMonth('prev')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold min-w-[200px] text-center">
          {formatMonthLabel(selectedMonth)}
        </h2>
        <button
          className="p-2 rounded-md border hover:bg-gray-100"
          onClick={() => navigateMonth('next')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Funds
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {data.availableFunds.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income minus spending
            </p>
          </CardContent>
        </Card>

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
            <p className="text-xs text-muted-foreground">
              Total spent this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Savings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              RM {data.savings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Saved this month
            </p>
          </CardContent>
        </Card>

        <Link href="/finance/transactions">
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Uncategorized
              </CardTitle>
              <Tag className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${data.uncategorizedCount === 0 ? 'text-green-600' : ''}`}>
                {data.uncategorizedCount}
              </div>
              <p className="text-xs text-muted-foreground">
                transactions need attention
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Category Spending Trend</CardTitle>
            <CardDescription>Spending by category over last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <CategorySpendingTrend
              data={data.categorySpendingTrend}
              categories={categories}
            />
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

function DashboardLoading() {
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  );
}
