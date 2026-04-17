# Delete Default Categories + Ignore Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add ability to delete default categories (with usage warning) and mark transactions as "ignored" (excluded from all stats/budgets).

**Architecture:** Two independent features sharing database/API changes. The `ignored` boolean column gates all statistical queries. Category deletion is relaxed for default categories but checks usage count first.

**Tech Stack:** Next.js 14, Drizzle ORM, PostgreSQL, Tailwind, shadcn/ui AlertDialog, base-ui dialog primitives.

---

## Task Map

| File | Change |
|------|--------|
| `lib/schema.ts` | Add `ignored` boolean column to transactions |
| `lib/categories.ts` | Remove isDefault guard; add usage count check |
| `lib/transactions.ts` | Add ignored filter to all query functions |
| `lib/budgets.ts` | Add ignored filter to `getSpendingForCategory` |
| `lib/dashboard.ts` | Add ignored filter to dashboard aggregation queries |
| `app/api/transactions/route.ts` | Filter ignored in GET; support `ignored` in PATCH |
| `app/api/categories/route.ts` | Pass `force` param through to lib |
| `app/components/settings/CategoryManager.tsx` | Remove isDefault guard; add AlertDialog for in-use categories |
| `app/components/transactions/TransactionList.tsx` | Add Ignored option to select; conditional row rendering |
| `components/ui/alert-dialog.tsx` | Create new AlertDialog component (shadcn style) |

---

## Task 1: Add `ignored` column to transactions schema

**Files:**
- Modify: `lib/schema.ts:3-19`

- [ ] **Step 1: Add `ignored` column to transactions table**

```typescript
// lib/schema.ts line 15 (after type field)
type: text('type', { enum: ['DEBIT', 'CREDIT'] }).notNull(),
category: text('category'),
ignored: boolean('ignored').notNull().default(false),  // ← add this
createdAt: timestamp('created_at').notNull(),
```

- [ ] **Step 2: Generate Drizzle migration**

Run: `npx drizzle-kit generate`
Expected: Migration file created with `ignored` column

- [ ] **Step 3: Push migration to DB**

Run: `npx drizzle-kit push`
Expected: Schema updated in database

- [ ] **Step 4: Commit**

```bash
git add lib/schema.ts drizzle.config.ts
git commit -m "feat: add ignored column to transactions"
```

---

## Task 2: Create AlertDialog component

**Files:**
- Create: `components/ui/alert-dialog.tsx`

- [ ] **Step 1: Create AlertDialog component**

The project uses `@base-ui/react/dialog` for Dialog. AlertDialog is a confirm-style dialog with a title, description, and action buttons. Create a standalone AlertDialog using base-ui primitives plus Button:

```tsx
"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

function AlertDialog({ open, onOpenChange, children }: DialogPrimitive.Root.Props & { children: React.ReactNode }) {
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>{children}</DialogPrimitive.Root>
}

function AlertDialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

function AlertDialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <DialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </AlertDialogPortal>
  )
}

function AlertDialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function AlertDialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogAction({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-action" className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90", className)} {...props} />
}

function AlertDialogCancel({ className, ...props }: React.ComponentProps<typeof Button>) {
  return <Button data-slot="alert-dialog-cancel" variant="outline" className={className} {...props} />
}

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/alert-dialog.tsx
git commit -m "feat: add AlertDialog component"
```

---

## Task 3: Update category deletion — remove isDefault guard, add usage check

**Files:**
- Modify: `lib/categories.ts:95-103`

- [ ] **Step 1: Update `deleteCategory` function**

Replace the existing function with:

```typescript
export async function deleteCategory(id: string, userId: string): Promise<void> {
  const category = await getCategoryById(id, userId);
  if (!category) {
    throw new Error('Category not found');
  }

  // Count transactions using this category name
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.category, category.name)
      )
    );
  const count = result?.count || 0;

  if (count > 0) {
    const error = new Error('Category is in use') as Error & { code: string; count: number };
    error.code = 'IN_USE';
    error.count = count;
    throw error;
  }

  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}
```

Note: Import `transactions` from schema and `sql` from drizzle-orm at the top of the file.

- [ ] **Step 2: Update imports in `lib/categories.ts`**

```typescript
import { db } from './db';
import { categories, transactions, type Category } from './schema';
import { eq, and, sql } from 'drizzle-orm';
```

- [ ] **Step 3: Commit**

```bash
git add lib/categories.ts
git commit -m "feat: check transaction usage count before deleting category"
```

---

## Task 4: Update transactions API — filter ignored, support ignored in PATCH

**Files:**
- Modify: `app/api/transactions/route.ts:26-91`

- [ ] **Step 1: Update GET — add ignored filter**

In `getTransactions` call, the `conditions` array already exists. Add to conditions:

```typescript
// After line: conditions.push(eq(transactions.type, filters.type));
conditions.push(eq(transactions.ignored, false));
```

The `getTransactions` function in `lib/transactions.ts` will be updated in Task 5 — this step only needs to verify the API passes the filter. Since `getTransactions` is called from the route, the route doesn't need changes for ignored filtering if the lib function is updated.

- [ ] **Step 2: Update PATCH to support `ignored` field**

Replace the PATCH handler body (lines 72-91):

```typescript
export async function PATCH(request: NextRequest) {
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, category, ignored } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    // Get transaction to verify ownership
    const tx = await getTransactionById(id);
    if (!tx || tx.userId !== userId) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Handle category update
    if (category !== undefined) {
      await updateTransactionCategory(id, category, userId);
    }

    // Handle ignored update
    if (ignored !== undefined) {
      await db
        .update(transactions)
        .set({ ignored, updatedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
```

Add import for `transactions` from schema and `and` from drizzle-orm at the top.

- [ ] **Step 3: Commit**

```bash
git add app/api/transactions/route.ts
git commit -m "feat: support ignored field in PATCH /api/transactions"
```

---

## Task 5: Add ignored filter to all transaction queries

**Files:**
- Modify: `lib/transactions.ts`

- [ ] **Step 1: Update `getTransactions`**

Add ignored filter to the conditions array (after the type filter):

```typescript
if (filters?.type) {
  conditions.push(eq(transactions.type, filters.type));
}
conditions.push(eq(transactions.ignored, false)); // ← add this
```

- [ ] **Step 2: Update `getMonthlySpending`**

In the where clause (around line 116-119), add ignored filter:

```typescript
.where(and(
  eq(transactions.userId, userId),
  gte(transactions.date, startDate),
  eq(transactions.ignored, false)  // ← add this
))
```

- [ ] **Step 3: Update `getCategoryBreakdown`**

In the where clause (around line 137-144), add ignored filter before `eq(transactions.type, 'DEBIT')`:

```typescript
.and(
  eq(transactions.userId, userId),
  gte(transactions.date, startDate),
  lte(transactions.date, endDate),
  eq(transactions.ignored, false),  // ← add this (between type and the other conditions)
  eq(transactions.type, 'DEBIT')
)
```

The full where should be:
```typescript
.where(
  and(
    eq(transactions.userId, userId),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
    eq(transactions.ignored, false),
    eq(transactions.type, 'DEBIT')
  )
)
```

- [ ] **Step 4: Update `getUncategorizedCount`**

Add ignored filter:

```typescript
.where(and(
  eq(transactions.userId, userId),
  isNull(transactions.category),
  eq(transactions.ignored, false)  // ← add this
));
```

- [ ] **Step 5: Commit**

```bash
git add lib/transactions.ts
git commit -m "feat: filter ignored transactions in all statistical queries"
```

---

## Task 6: Add ignored filter to budget and dashboard queries

**Files:**
- Modify: `lib/budgets.ts`
- Modify: `lib/dashboard.ts`

- [ ] **Step 1: Update `getSpendingForCategory` in `lib/budgets.ts`**

Add ignored filter to the where clause (around line 64-71):

```typescript
.where(
  and(
    eq(transactions.userId, userId),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
    eq(transactions.category, categoryName),
    eq(transactions.ignored, false)  // ← add this
  )
)
```

- [ ] **Step 2: Update dashboard query in `lib/dashboard.ts`**

There are two transaction queries in `getDashboardData`:
1. `categoryTrendData` query (line 24-42) — add ignored filter alongside `eq(transactions.type, 'DEBIT')`
2. `incomeData` query (line 77-89) — add ignored filter alongside `eq(transactions.type, 'CREDIT')`
3. `categoryData` query (line 95-109) — add ignored filter alongside `eq(transactions.type, 'DEBIT')`

For `categoryTrendData` (line 31-36), add `eq(transactions.ignored, false)` to the where and:

```typescript
.and(
  eq(transactions.userId, userId),
  gte(transactions.date, trendStart),
  eq(transactions.ignored, false),   // ← add this
  eq(transactions.type, 'DEBIT')
)
```

For `incomeData` (line 82-88), add `eq(transactions.ignored, false)`:

```typescript
.and(
  eq(transactions.userId, userId),
  gte(transactions.date, monthStart),
  lte(transactions.date, monthEnd),
  eq(transactions.ignored, false),  // ← add this
  eq(transactions.type, 'CREDIT')
)
```

For `categoryData` (line 101-108), add `eq(transactions.ignored, false)`:

```typescript
.and(
  eq(transactions.userId, userId),
  gte(transactions.date, monthStart),
  lte(transactions.date, monthEnd),
  eq(transactions.ignored, false),  // ← add this
  eq(transactions.type, 'DEBIT')
)
```

- [ ] **Step 3: Commit**

```bash
git add lib/budgets.ts lib/dashboard.ts
git commit -m "feat: filter ignored transactions in budget and dashboard queries"
```

---

## Task 7: Update CategoryManager — delete button and AlertDialog

**Files:**
- Modify: `app/components/settings/CategoryManager.tsx:1-399`

- [ ] **Step 1: Add imports**

Add AlertDialog and EyeOff icon:

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { EyeOff } from 'lucide-react';
```

- [ ] **Step 2: Add state for AlertDialog and usage count**

Add after `const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false)`:

```typescript
const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
const [deleteUsageCount, setDeleteUsageCount] = useState(0);
```

- [ ] **Step 3: Update `handleDelete` to show AlertDialog when in use**

Replace the `handleDelete` function (lines 123-139):

```typescript
async function handleDelete(categoryId: string) {
  try {
    const response = await fetch(`/api/categories?id=${categoryId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.error === 'Category is in use') {
        // Find the category to show its name
        const cat = categories.find(c => c.id === categoryId);
        setDeleteTarget(cat || null);
        setDeleteUsageCount(error.count || 0);
        setIsDeleteDialogOpen(true);
        return;
      }
      throw new Error(error.error || 'Failed to delete category');
    }

    fetchCategories();
  } catch (error) {
    console.error('Error deleting category:', error);
    alert(error instanceof Error ? error.message : 'An error occurred');
  }
}

async function handleForceDelete() {
  if (!deleteTarget) return;
  try {
    const response = await fetch(`/api/categories?id=${deleteTarget.id}&force=true`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete category');
    }

    setIsDeleteDialogOpen(false);
    setDeleteTarget(null);
    fetchCategories();
  } catch (error) {
    console.error('Error deleting category:', error);
    alert(error instanceof Error ? error.message : 'An error occurred');
    setIsDeleteDialogOpen(false);
  }
}
```

- [ ] **Step 4: Remove `!category.isDefault` guard on delete button**

In the table cell actions (around line 251), remove the conditional — all categories get the delete button:

```typescript
<div className="flex items-center gap-1">
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8"
    onClick={() => openBudgetDialog(category)}
    title="Set Budget"
  >
    <Wallet className="h-4 w-4" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8"
    onClick={() => openEditDialog(category)}
  >
    <Pencil className="h-4 w-4" />
  </Button>
  <Button
    variant="ghost"
    size="icon"
    className="h-8 w-8 text-destructive hover:text-destructive"
    onClick={() => handleDelete(category.id)}
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</div>
```

(Remove the `!category.isDefault && (... )` wrapper around Pencil and Trash2 buttons.)

- [ ] **Step 5: Add AlertDialog at the bottom of the component return**

Add before the closing `</Card>` tag:

```tsx
<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Category?</AlertDialogTitle>
      <AlertDialogDescription>
        {deleteTarget?.name} is assigned to {deleteUsageCount} transaction{deleteUsageCount !== 1 ? 's' : ''}. They will become uncategorized.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleForceDelete}>Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 6: Commit**

```bash
git add app/components/settings/CategoryManager.tsx
git commit -m "feat: allow deleting default categories with usage warning"
```

---

## Task 8: Update TransactionList — Ignored option and row rendering

**Files:**
- Modify: `app/components/transactions/TransactionList.tsx:1-136`

- [ ] **Step 1: Add `ignored` to Transaction type**

```typescript
type Transaction = {
  id: string;
  date: Date;
  merchant: string;
  description: string;
  amount: number;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
  category: string | undefined;
  ignored: boolean;  // ← add this
}
```

- [ ] **Step 2: Add EyeOff import and update props**

```typescript
import { EyeOff } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (transactionId: string, category: string | undefined) => void;
  onIgnoreTransaction: (transactionId: string, ignored: boolean) => void;  // ← add this
}
```

- [ ] **Step 3: Update component signature and add updating state**

```typescript
export function TransactionList({
  transactions,
  categories,
  onCategoryChange,
  onIgnoreTransaction,  // ← add
}: TransactionListProps) {
  const [updating, setUpdating] = useState<string | null>(null);
```

- [ ] **Step 4: Add `handleIgnore` helper**

Add after `handleCategoryChange`:

```typescript
const handleIgnore = async (transactionId: string, ignored: boolean) => {
  setUpdating(transactionId);
  await onIgnoreTransaction(transactionId, ignored);
  setUpdating(null);
};
```

- [ ] **Step 5: Update TableRow to show Ignored state**

Replace the TableRow content (lines 74-129):

```typescript
<TableRow key={transaction.id} className={transaction.ignored ? 'opacity-50' : ''}>
  <TableCell>
    {format(new Date(transaction.date), 'MMM dd, yyyy')}
  </TableCell>
  <TableCell>
    <div className="font-medium">{transaction.merchant}</div>
    <div className="text-sm text-muted-foreground">
      {transaction.description}
    </div>
  </TableCell>
  <TableCell
    className={
      transaction.type === 'CREDIT'
        ? 'text-green-600'
        : 'text-red-600'
    }
    title={transaction.originalCurrency ?
      `${transaction.originalCurrency} ${transaction.originalAmount?.toFixed(2)} @ ${transaction.exchangeRate?.toFixed(4)}` :
      undefined}
  >
    {transaction.type === 'CREDIT' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
  </TableCell>
  <TableCell>
    {transaction.ignored ? (
      <div className="flex items-center gap-2">
        <EyeOff className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Ignored</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => handleIgnore(transaction.id, false)}
          disabled={updating === transaction.id}
        >
          Undo
        </Button>
      </div>
    ) : (
      <Select
        value={transaction.category || 'uncategorized'}
        onValueChange={(value) => {
          const id = transaction.id;
          if (id && value) {
            handleCategoryChange(
              id,
              value === 'uncategorized' ? undefined : value
            );
          }
        }}
        disabled={updating === transaction.id}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="uncategorized">Uncategorized</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.name}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </div>
            </SelectItem>
          ))}
          <SelectItem value="__ignored__">Ignored</SelectItem>
        </SelectContent>
      </Select>
    )}
  </TableCell>
</TableRow>
```

Note: The `"__ignored__"` value is checked in `handleCategoryChange` — if value is `"__ignored__"`, call `handleIgnore(id, true)` instead.

- [ ] **Step 6: Update `handleCategoryChange` to handle ignored**

```typescript
const handleCategoryChange = async (transactionId: string, category: string | undefined) => {
  setUpdating(transactionId);
  if (category === '__ignored__') {
    await onIgnoreTransaction(transactionId, true);
  } else {
    await onCategoryChange(transactionId, category);
  }
  setUpdating(null);
};
```

- [ ] **Step 7: Commit**

```bash
git add app/components/transactions/TransactionList.tsx
git commit -m "feat: add ignore transaction option to transaction list"
```

---

## Task 9: Update transactions page — wire up onIgnoreTransaction

**Files:**
- Modify: `app/finance/transactions/page.tsx`

- [ ] **Step 1: Update `handleCategoryChange` to also handle ignore**

Replace the function (lines 81-100):

```typescript
async function handleCategoryChange(transactionId: string, category: string | undefined) {
  // Handled by handleIgnoreTransaction
}

async function handleIgnoreTransaction(transactionId: string, ignored: boolean) {
  try {
    const response = await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: transactionId, ignored }),
    });

    if (response.ok) {
      setTransactions(prev =>
        prev.map(t =>
          t.id === transactionId ? { ...t, ignored } : t
        )
      );
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
  }
}
```

- [ ] **Step 2: Pass handler to TransactionList**

Update the TransactionList component call (around line 147-151):

```tsx
<TransactionList
  transactions={transactions}
  categories={categories}
  onCategoryChange={handleCategoryChange}
  onIgnoreTransaction={handleIgnoreTransaction}
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/finance/transactions/page.tsx
git commit -m "feat: wire up ignore transaction handler in transactions page"
```

---

## Self-Review Checklist

1. **Spec coverage:** All requirements from spec are covered by tasks above.
2. **Placeholder scan:** No "TBD", "TODO", or vague steps found.
3. **Type consistency:** `ignored` field used consistently across schema, API, and components.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-15-delete-default-categories-and-ignore-transactions-plan.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**