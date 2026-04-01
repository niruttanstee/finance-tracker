# Category Budgets Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Add monthly budget management for categories with spending tracking, overspend warnings, and rollover to main funds.

**Architecture:** Extend existing categories system with monthly budget limits. Store budget configurations in new `categoryBudgets` table. Query transaction data to calculate current month spending. Display budget cards with visual overspend indicators.

**Tech Stack:** Next.js 14, React, TypeScript, SQLite + Drizzle ORM, shadcn/ui, Tailwind CSS

---

## Task 1: Database Schema Migration

**Files:**
- Create: `drizzle/migrations/0002_add_category_budgets.sql`
- Modify: `lib/schema.ts`
- Modify: `lib/db.ts` (if migration runner needed)

**Step 1: Add budget table to schema**

Edit `lib/schema.ts` to add new table:

```typescript
export const categoryBudgets = sqliteTable('category_budgets', {
  id: text('id').primaryKey(), // composite: categoryId_yearMonth
  categoryId: text('category_id').notNull().references(() => categories.id),
  yearMonth: text('year_month', { length: 7 }).notNull(), // YYYY-MM format
  monthlyLimit: real('monthly_limit').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type CategoryBudget = typeof categoryBudgets.$inferSelect;
export type NewCategoryBudget = typeof categoryBudgets.$inferInsert;
```

**Step 2: Create migration SQL**

Create `drizzle/migrations/0002_add_category_budgets.sql`:

```sql
CREATE TABLE IF NOT EXISTS category_budgets (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  year_month TEXT NOT NULL,
  monthly_limit REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_category_budgets_category ON category_budgets(category_id);
CREATE INDEX idx_category_budgets_month ON category_budgets(year_month);
```

**Step 3: Run migration**

```bash
npm run db:push
```

Expected: Migration applied successfully

**Step 4: Commit**

```bash
git add lib/schema.ts drizzle/migrations/0002_add_category_budgets.sql
git commit -m "feat: add category_budgets table for monthly budgets"
```

---

## Task 2: Budget Database Operations

**Files:**
- Create: `lib/budgets.ts`

**Step 1: Write budget operations**

Create `lib/budgets.ts`:

```typescript
import { db } from './db';
import { categoryBudgets, transactions, categories, type CategoryBudget } from './schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface BudgetWithSpending {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
}

export async function getOrCreateBudget(
  categoryId: string,
  yearMonth: string,
  defaultLimit: number = 0
): Promise<CategoryBudget> {
  const id = `${categoryId}_${yearMonth}`;
  
  const existing = await db.query.categoryBudgets.findFirst({
    where: eq(categoryBudgets.id, id),
  });
  
  if (existing) {
    return existing;
  }
  
  const now = new Date();
  const [budget] = await db
    .insert(categoryBudgets)
    .values({
      id,
      categoryId,
      yearMonth,
      monthlyLimit: defaultLimit,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  
  return budget;
}

export async function updateBudgetLimit(
  categoryId: string,
  yearMonth: string,
  monthlyLimit: number
): Promise<CategoryBudget> {
  const id = `${categoryId}_${yearMonth}`;
  const now = new Date();
  
  const [budget] = await db
    .insert(categoryBudgets)
    .values({
      id,
      categoryId,
      yearMonth,
      monthlyLimit,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: categoryBudgets.id,
      set: { monthlyLimit, updatedAt: now },
    })
    .returning();
  
  return budget;
}

export async function getBudgetsWithSpending(
  yearMonth: string
): Promise<BudgetWithSpending[]> {
  // Get start and end of month
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  // Get all categories with their budgets for this month
  const allCategories = await db.query.categories.findMany();
  const budgets = await db.query.categoryBudgets.findMany({
    where: eq(categoryBudgets.yearMonth, yearMonth),
  });
  const budgetMap = new Map(budgets.map(b => [b.categoryId, b]));
  
  // Calculate spending per category
  const spendingResult = await db
    .select({
      category: transactions.category,
      spent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        sql`${transactions.category} IS NOT NULL`
      )
    )
    .groupBy(transactions.category);
  
  const spendingMap = new Map(spendingResult.map(s => [s.category, s.spent || 0]));
  
  // Build result for categories that have budgets set
  return allCategories
    .filter(cat => {
      const budget = budgetMap.get(cat.id);
      return budget && budget.monthlyLimit > 0;
    })
    .map(cat => {
      const budget = budgetMap.get(cat.id)!;
      const spent = spendingMap.get(cat.name) || 0;
      const remaining = Math.max(0, budget.monthlyLimit - spent);
      const overspent = spent > budget.monthlyLimit;
      const savedAmount = spent < budget.monthlyLimit ? budget.monthlyLimit - spent : 0;
      
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        monthlyLimit: budget.monthlyLimit,
        spent,
        remaining,
        overspent,
        savedAmount,
      };
    });
}

export async function getBudgetForCategory(
  categoryId: string,
  yearMonth: string
): Promise<CategoryBudget | undefined> {
  const id = `${categoryId}_${yearMonth}`;
  return db.query.categoryBudgets.findFirst({
    where: eq(categoryBudgets.id, id),
  });
}
```

**Step 2: Commit**

```bash
git add lib/budgets.ts
git commit -m "feat: add budget database operations"
```

---

## Task 3: Budget API Endpoints

**Files:**
- Create: `app/api/budgets/route.ts`
- Create: `app/api/budgets/[categoryId]/route.ts`

**Step 1: Create budgets list endpoint**

Create `app/api/budgets/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getBudgetsWithSpending, updateBudgetLimit } from '@/lib/budgets';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('yearMonth');
    
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: 'Valid yearMonth required (YYYY-MM format)' },
        { status: 400 }
      );
    }
    
    const budgets = await getBudgetsWithSpending(yearMonth);
    
    return NextResponse.json({ data: budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { categoryId, yearMonth, monthlyLimit } = await request.json();
    
    if (!categoryId || !yearMonth || typeof monthlyLimit !== 'number') {
      return NextResponse.json(
        { error: 'categoryId, yearMonth, and monthlyLimit required' },
        { status: 400 }
      );
    }
    
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: 'yearMonth must be in YYYY-MM format' },
        { status: 400 }
      );
    }
    
    if (monthlyLimit < 0) {
      return NextResponse.json(
        { error: 'monthlyLimit must be non-negative' },
        { status: 400 }
      );
    }
    
    const budget = await updateBudgetLimit(categoryId, yearMonth, monthlyLimit);
    
    return NextResponse.json({ data: budget });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}
```

**Step 2: Create single budget endpoint**

Create `app/api/budgets/[categoryId]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getBudgetForCategory, updateBudgetLimit } from '@/lib/budgets';

export async function GET(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('yearMonth');
    
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: 'Valid yearMonth required (YYYY-MM format)' },
        { status: 400 }
      );
    }
    
    const budget = await getBudgetForCategory(params.categoryId, yearMonth);
    
    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ data: budget });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { yearMonth, monthlyLimit } = await request.json();
    
    if (!yearMonth || typeof monthlyLimit !== 'number') {
      return NextResponse.json(
        { error: 'yearMonth and monthlyLimit required' },
        { status: 400 }
      );
    }
    
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: 'yearMonth must be in YYYY-MM format' },
        { status: 400 }
      );
    }
    
    if (monthlyLimit < 0) {
      return NextResponse.json(
        { error: 'monthlyLimit must be non-negative' },
        { status: 400 }
      );
    }
    
    const budget = await updateBudgetLimit(params.categoryId, yearMonth, monthlyLimit);
    
    return NextResponse.json({ data: budget });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add app/api/budgets/
git commit -m "feat: add budget API endpoints"
```

---

## Task 4: Settings - Add Budget Management to Categories

**Files:**
- Modify: `app/components/settings/CategoryManager.tsx`
- Modify: `lib/categories.ts` (add getCategoriesWithBudgets)

**Step 1: Add budget column to category manager**

Edit `app/components/settings/CategoryManager.tsx`:

Add to imports:
```typescript
import { Wallet } from 'lucide-react';
```

Update `Category` interface:
```typescript
interface Category {
  id: string;
  name: string;
  color: string;
  isDefault: boolean;
  monthlyBudget?: number;
}
```

Update `CategoryFormData`:
```typescript
interface CategoryFormData {
  id?: string;
  name: string;
  color: string;
  monthlyBudget?: number;
}
```

Add new state:
```typescript
const [currentYearMonth, setCurrentYearMonth] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
});
```

Update `fetchCategories` to also fetch budgets:
```typescript
async function fetchCategories() {
  try {
    // Fetch categories
    const catResponse = await fetch('/api/categories');
    const catData = await catResponse.json();
    
    // Fetch budgets for current month
    const budgetResponse = await fetch(`/api/budgets?yearMonth=${currentYearMonth}`);
    const budgetData = await budgetResponse.json();
    const budgetMap = new Map(
      (budgetData.data || []).map((b: any) => [b.categoryId, b.monthlyLimit])
    );
    
    // Merge budget data
    const categoriesWithBudgets = (catData.data || []).map((cat: Category) => ({
      ...cat,
      monthlyBudget: budgetMap.get(cat.id) || 0,
    }));
    
    setCategories(categoriesWithBudgets);
  } catch (error) {
    console.error('Error fetching categories:', error);
  } finally {
    setLoading(false);
  }
}
```

Update `handleSave` to also save budget:
```typescript
async function handleSave() {
  try {
    if (editingCategory) {
      // Update category
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: formData.id,
          name: formData.name,
          color: formData.color,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update category');
      }
      
      // Update budget
      if (formData.monthlyBudget !== undefined) {
        const budgetResponse = await fetch(`/api/budgets/${formData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            yearMonth: currentYearMonth,
            monthlyLimit: formData.monthlyBudget,
          }),
        });
        
        if (!budgetResponse.ok) {
          console.error('Failed to update budget');
        }
      }
    } else {
      // Create category
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create category');
      }
    }
    
    setIsDialogOpen(false);
    fetchCategories();
  } catch (error) {
    console.error('Error saving category:', error);
    alert(error instanceof Error ? error.message : 'An error occurred');
  }
}
```

Update `openEditDialog`:
```typescript
function openEditDialog(category: Category) {
  setEditingCategory(category);
  setFormData({
    id: category.id,
    name: category.name,
    color: category.color,
    monthlyBudget: category.monthlyBudget || 0,
  });
  setIsDialogOpen(true);
}
```

Update table header:
```typescript
<TableHeader>
  <TableRow>
    <TableHead>Color</TableHead>
    <TableHead>Name</TableHead>
    <TableHead>Monthly Budget (MYR)</TableHead>
    <TableHead>Type</TableHead>
    <TableHead className="w-[100px]">Actions</TableHead>
  </TableRow>
</TableHeader>
```

Update table body cell for budget:
```typescript
<TableCell>
  {category.monthlyBudget ? (
    <span className="font-medium">{category.monthlyBudget.toLocaleString()} MYR</span>
  ) : (
    <span className="text-muted-foreground text-sm">No budget set</span>
  )}
</TableCell>
```

Add budget input to dialog:
```typescript
<div className="space-y-2">
  <label className="text-sm font-medium flex items-center gap-2">
    <Wallet className="h-4 w-4" />
    Monthly Budget (MYR)
  </label>
  <Input
    type="number"
    min="0"
    step="1"
    value={formData.monthlyBudget || ''}
    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
      setFormData({ ...formData, monthlyBudget: parseFloat(e.target.value) || 0 })
    }
    placeholder="0"
  />
  <p className="text-xs text-muted-foreground">
    Set to 0 to remove budget for this category
  </p>
</div>
```

**Step 2: Commit**

```bash
git add app/components/settings/CategoryManager.tsx
git commit -m "feat: add budget editing to category settings"
```

---

## Task 5: Create Budget Card Component

**Files:**
- Create: `app/components/budgets/BudgetCard.tsx`

**Step 1: Write budget card component**

Create `app/components/budgets/BudgetCard.tsx`:

```typescript
'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';

interface BudgetCardProps {
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
}

export function BudgetCard({
  categoryName,
  categoryColor,
  monthlyLimit,
  spent,
  remaining,
  overspent,
  savedAmount,
}: BudgetCardProps) {
  const percentage = Math.min(100, (spent / monthlyLimit) * 100);
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const currentDay = new Date().getDate();
  const daysRemaining = daysInMonth - currentDay;
  
  return (
    <Card className={`transition-colors ${overspent ? 'bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-800' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: categoryColor }}
            >
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{categoryName}</h3>
              <p className="text-sm text-muted-foreground">
                {daysRemaining} days remaining
              </p>
            </div>
          </div>
          {overspent ? (
            <AlertTriangle className="h-6 w-6 text-red-600" />
          ) : savedAmount > 0 ? (
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-sm text-muted-foreground">Spent</p>
            <p className={`text-2xl font-bold ${overspent ? 'text-red-600' : ''}`}>
              {spent.toLocaleString()} MYR
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="text-2xl font-bold text-muted-foreground">
              {monthlyLimit.toLocaleString()} MYR
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <Progress 
            value={percentage} 
            className={`h-3 ${overspent ? 'bg-red-200' : ''}`}
          />
          <div className="flex justify-between text-sm">
            <span className={overspent ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
              {percentage.toFixed(0)}% used
            </span>
            {overspent ? (
              <span className="text-red-600 font-medium">
                Over by {(spent - monthlyLimit).toLocaleString()} MYR
              </span>
            ) : (
              <span className="text-green-600">
                {remaining.toLocaleString()} MYR remaining
              </span>
            )}
          </div>
        </div>
        
        {savedAmount > 0 && (
          <div className="pt-2 border-t border-dashed">
            <p className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {savedAmount.toLocaleString()} MYR saved this month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add app/components/budgets/BudgetCard.tsx
git commit -m "feat: create BudgetCard component with overspend indicators"
```

---

## Task 6: Create Budgets Page

**Files:**
- Create: `app/budgets/page.tsx`

**Step 1: Create budgets page**

Create `app/budgets/page.tsx`:

```typescript
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
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
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
              spent={budget.spent}
              remaining={budget.remaining}
              overspent={budget.overspent}
              savedAmount={budget.savedAmount}
            />
          ))}
        </div>
      )}
    </main>
  );
}
```

**Step 2: Commit**

```bash
git add app/budgets/page.tsx
git commit -m "feat: create budgets page with navigation and summary"
```

---

## Task 7: Update Navigation

**Files:**
- Modify: `app/components/Navigation.tsx`

**Step 1: Add budgets link to navigation**

Edit `app/components/Navigation.tsx` to add Budgets link (usually between Dashboard and Transactions):

```typescript
import { Wallet } from 'lucide-react';

// In the navigation items array, add:
{
  href: '/budgets',
  label: 'Budgets',
  icon: Wallet,
}
```

**Step 2: Commit**

```bash
git add app/components/Navigation.tsx
git commit -m "feat: add Budgets link to navigation"
```

---

## Task 8: Add Progress Component (if missing)

**Files:**
- Check: `components/ui/progress.tsx`

**Step 1: Install progress component if not exists**

```bash
ls components/ui/progress.tsx || npx shadcn add progress
```

**Step 2: Commit (if installed)**

```bash
git add components/ui/progress.tsx
git commit -m "chore: add shadcn progress component"
```

---

## Task 9: Integration Testing

**Files:**
- All modified files

**Step 1: Test the complete flow**

1. Navigate to Settings page
2. Add budget to a category (e.g., Food = 1000 MYR)
3. Navigate to Budgets page
4. Verify card appears with correct budget
5. Add transactions in that category
6. Refresh budgets page to see updated spending
7. Test month navigation
8. Verify overspend turns card red

**Step 2: Run build check**

```bash
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete category budget management system"
```

---

## Summary

This implementation adds:
1. **Database:** `categoryBudgets` table to store monthly limits
2. **API:** Endpoints to fetch and update budgets with spending calculation
3. **Settings:** Budget editing in CategoryManager
4. **UI:** BudgetCard component with visual overspend indicators
5. **Page:** `/budgets` route with month navigation and summary stats
6. **Navigation:** Budgets link in main nav

**Key Features:**
- Monthly budget tracking per category
- Real-time spending calculation from transactions
- Visual overspend warning (red card + alert icon)
- Savings tracking (underspend amount)
- Month-to-month navigation
- Summary statistics

**Rollover Behavior:** Underspend is tracked as "savedAmount" and displayed, but does NOT increase next month's budget (goes to main funds).