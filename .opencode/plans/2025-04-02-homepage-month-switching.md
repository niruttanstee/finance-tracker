# Homepage Month Switching & Additional Charts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add month navigation to homepage matching budget page UI, display all charts for selected month, add savings tracking chart, and make Savings a protected default category.

**Architecture:** Convert homepage from server to client component with URL-based month state (`?month=2024-03`). Add new API endpoint for month-specific dashboard data. Use left/right chevron buttons with centered month display (matching budgets page UI).

**Tech Stack:** Next.js 14 App Router, React, TypeScript, Recharts, date-fns, shadcn/ui Button, lucide-react icons

---

## Task 1: Add Savings as Default Category

**Files:**
- Modify: `scripts/init-db.ts:9-19`

**Step 1: Add Savings to default categories list**

```typescript
const defaultCategories = [
  { id: 'food', name: 'Food & Dining', color: '#ef4444', isDefault: true },
  { id: 'shopping', name: 'Shopping', color: '#f97316', isDefault: true },
  { id: 'transport', name: 'Transportation', color: '#eab308', isDefault: true },
  { id: 'bills', name: 'Bills & Utilities', color: '#22c55e', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', color: '#3b82f6', isDefault: true },
  { id: 'healthcare', name: 'Healthcare', color: '#a855f7', isDefault: true },
  { id: 'travel', name: 'Travel', color: '#ec4899', isDefault: true },
  { id: 'income', name: 'Income', color: '#14b8a6', isDefault: true },
  { id: 'savings', name: 'Savings', color: '#10b981', isDefault: true },
  { id: 'other', name: 'Other', color: '#6b7280', isDefault: true },
];
```

**Step 2: Test the change**

Run: `npm run db:init`

**Step 3: Commit**

```bash
git add scripts/init-db.ts
git commit -m "feat: add Savings as default protected category"
```

---

## Task 2: Create Dashboard API Endpoint with Month Filtering

**Files:**
- Create: `app/api/dashboard/route.ts`
- Create: `lib/dashboard.ts`

**Step 1: Create dashboard data utilities**

Create `lib/dashboard.ts`:

```typescript
import { db } from './db';
import { transactions } from './schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface DashboardData {
  month: string;
  spending: number;
  income: number;
  savings: number;
  savingsRate: number;
  categoryBreakdown: { category: string; amount: number; color: string }[];
  monthlyTrend: { month: string; spending: number; income: number; savings: number }[];
}

export async function getDashboardData(monthStr: string): Promise<DashboardData> {
  const monthDate = new Date(monthStr + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  
  // Get 6-month trend ending at selected month
  const trendStart = startOfMonth(subMonths(monthDate, 5));
  
  // Fetch monthly trend data
  const trendData = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`,
      spending: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
      income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'CREDIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(gte(transactions.date, trendStart))
    .groupBy(sql`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`);
  
  // Fetch category breakdown for selected month
  const categoryData = await db
    .select({
      category: transactions.category,
      amount: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
        eq(transactions.type, 'DEBIT')
      )
    )
    .groupBy(transactions.category);
  
  // Get category colors
  const categoryList = await db.query.categories.findMany();
  const categoryMap = new Map(categoryList.map(c => [c.name, c.color]));
  
  const categoryBreakdown = categoryData.map(r => ({
    category: r.category || 'Uncategorized',
    amount: r.amount,
    color: categoryMap.get(r.category || '') || '#6b7280',
  }));
  
  // Calculate totals for selected month
  const monthData = trendData.find(d => d.month === monthStr) || { spending: 0, income: 0 };
  const spending = monthData.spending;
  const income = monthData.income;
  const savings = income - spending;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  
  return {
    month: monthStr,
    spending,
    income,
    savings,
    savingsRate,
    categoryBreakdown,
    monthlyTrend: trendData.map(d => ({
      month: d.month,
      spending: d.spending,
      income: d.income,
      savings: d.income - d.spending,
    })),
  };
}
```

**Step 2: Create API route**

Create `app/api/dashboard/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getDashboardData } from '@/lib/dashboard';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    
    // Default to current month if not specified
    const targetMonth = month || format(new Date(), 'yyyy-MM');
    
    const data = await getDashboardData(targetMonth);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
```

**Step 3: Test the API**

Start dev server: `npm run dev`

Test: `curl "http://localhost:3000/api/dashboard?month=2024-03"`

**Step 4: Commit**

```bash
git add lib/dashboard.ts app/api/dashboard/route.ts
git commit -m "feat: add dashboard API with month filtering"
```

---

## Task 3: Create Savings Rate Chart Component

**Files:**
- Create: `app/components/charts/SavingsRate.tsx`

**Step 1: Create savings rate chart**

Create `app/components/charts/SavingsRate.tsx`:

```typescript
'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface TrendData {
  month: string;
  spending: number;
  income: number;
  savings: number;
}

interface SavingsRateProps {
  data: TrendData[];
}

export function SavingsRate({ data }: SavingsRateProps) {
  const formattedData = data.map(item => ({
    ...item,
    formattedMonth: format(parseISO(item.month + '-01'), 'MMM yyyy'),
    savingsRate: item.income > 0 ? ((item.savings / item.income) * 100) : 0,
  }));
  
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="formattedMonth" 
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `RM ${Number(value).toFixed(0)}`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) => `${Number(value).toFixed(0)}%`}
          />
          <Tooltip 
            formatter={(value, name) => {
              const numValue = Number(value);
              if (name === 'Savings Rate') {
                return [`${numValue.toFixed(1)}%`, name];
              }
              return [`RM ${numValue.toFixed(2)}`, name];
            }}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Bar 
            yAxisId="left"
            dataKey="income" 
            fill="#14b8a6" 
            name="Income"
            stackId="a"
          />
          <Bar 
            yAxisId="left"
            dataKey="spending" 
            fill="#ef4444" 
            name="Spending"
            stackId="a"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="savingsRate"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', strokeWidth: 2 }}
            name="Savings Rate"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/charts/SavingsRate.tsx
git commit -m "feat: add savings rate chart component"
```

---

## Task 4: Convert Homepage to Client Component with Budget-Style Month Navigation

**Files:**
- Modify: `app/page.tsx`

**Step 1: Convert to client component with URL state and budget-style navigation**

Replace `app/page.tsx`:

```typescript
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
```

**Step 2: Test the changes**

Run: `npm run dev`

Navigate to: `http://localhost:3000`

Verify:
- [ ] Left/right chevron buttons match budget page style
- [ ] Month display centered between buttons
- [ ] Can navigate to previous/next months
- [ ] All metrics update when month changes
- [ ] Charts show correct data for selected month
- [ ] URL updates with ?month= parameter

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: convert homepage to client component with budget-style month navigation"
```

---

## Task 5: Update CategoryBreakdown to Support Dynamic Data

**Files:**
- Modify: `app/components/charts/CategoryBreakdown.tsx`

**Step 1: Ensure component handles empty data gracefully**

Modify `app/components/charts/CategoryBreakdown.tsx`:

```typescript
'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface CategoryData {
  category: string;
  amount: number;
  color: string;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  
  if (data.length === 0) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
        No spending data for this period
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="amount"
            nameKey="category"
            label={({ category, percent }) => 
              percent > 0.05 ? `${category}: ${(percent * 100).toFixed(0)}%` : ''
            }
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => {
              const numValue = Number(value);
              const percent = total > 0 ? (numValue / total) * 100 : 0;
              return [`RM ${numValue.toFixed(2)} (${percent.toFixed(1)}%)`, name];
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/charts/CategoryBreakdown.tsx
git commit -m "feat: update category breakdown to handle empty data"
```

---

## Task 6: Run Tests and Verify Build

**Step 1: Run linter**

```bash
npm run lint
```

Expected: No errors

**Step 2: Build the project**

```bash
npm run build
```

Expected: Build succeeds

**Step 3: Commit any final changes**

```bash
git add .
git commit -m "chore: final cleanup and build verification"
```

---

## Summary

**Features Added:**
1. **Month Navigation** - Budget-style navigation with left/right chevrons and centered month display
2. **Persistent State** - Selected month stored in URL (`?month=2024-03`)
3. **Savings Category** - Added as protected default category
4. **Savings Rate Chart** - Shows income vs spending with savings rate trend line
5. **Enhanced Metrics** - Income, Spending, and Savings cards with comparisons

**Key Files:**
- `app/page.tsx` - Client component with budget-style month navigation
- `app/components/charts/SavingsRate.tsx` - New savings visualization
- `app/api/dashboard/route.ts` - Dashboard data API
- `lib/dashboard.ts` - Dashboard data utilities
- `scripts/init-db.ts` - Added Savings category

**UI Pattern (Matching Budgets Page):**
```
[◀]    March 2024    [▶]
```

**Testing Checklist:**
- [ ] Month navigation matches budget page UI (chevron buttons + centered month)
- [ ] Charts refresh when month changes
- [ ] Savings category appears in category list
- [ ] Cannot delete Savings category
- [ ] All graphs display correctly
- [ ] Build passes without errors
