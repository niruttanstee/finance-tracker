'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BudgetCard } from '../components/budgets/BudgetCard';
import { ArrowLeft, ChevronLeft, ChevronRight, Wallet } from 'lucide-react';

interface BudgetData {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  baseBudget: number;
  rolloverAmount: number;
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
  noRollover: boolean;
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentYearMonth, setCurrentYearMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    fetchBudgets();
  }, [currentYearMonth]);

  async function fetchBudgets() {
    try {
      setLoading(true);
      const response = await fetch(`/api/budgets?yearMonth=${currentYearMonth}`);
      const data = await response.json();
      setBudgets(data.data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  }

  function navigateMonth(direction: 'prev' | 'next') {
    const [year, month] = currentYearMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + (direction === 'next' ? 1 : -1), 1);
    const newYearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setCurrentYearMonth(newYearMonth);
  }

  function formatMonthLabel(yearMonth: string): string {
    const [year, month] = yearMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalOverspent = budgets.filter(b => b.overspent).length;
  const totalSaved = budgets.reduce((sum, b) => sum + b.savedAmount, 0);

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Budgets</h1>
            <p className="text-muted-foreground">
              Track your monthly spending by category
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline">
              <Wallet className="mr-2 h-4 w-4" />
              Manage Budgets
            </Button>
          </Link>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigateMonth('prev')}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold min-w-[200px] text-center">
          {formatMonthLabel(currentYearMonth)}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navigateMonth('next')}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalBudget.toLocaleString()} MYR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalSpent.toLocaleString()} MYR</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories Over Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalOverspent > 0 ? 'text-red-600' : ''}`}>
              {totalOverspent}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {totalSaved.toLocaleString()} MYR
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Cards */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading budgets...</p>
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No budgets set</h3>
            <p className="text-muted-foreground mb-4">
              Set up monthly budgets for your categories to track spending
            </p>
            <Link href="/settings">
              <Button>Go to Settings</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.categoryId}
              categoryName={budget.categoryName}
              categoryColor={budget.categoryColor}
              monthlyLimit={budget.monthlyLimit}
              baseBudget={budget.baseBudget}
              rolloverAmount={budget.rolloverAmount}
              spent={budget.spent}
              remaining={budget.remaining}
              overspent={budget.overspent}
              savedAmount={budget.savedAmount}
              noRollover={budget.noRollover}
            />
          ))}
        </div>
      )}
    </main>
  );
}