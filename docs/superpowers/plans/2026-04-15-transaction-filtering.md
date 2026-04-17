# Transaction Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add date range and category filtering to the Transactions page using TanStack Table with shadcn UI components. Filters are server-side via existing API.

**Architecture:** TanStack Table wraps transaction rows. FilterBar component holds date range and category filter state. Filter changes reset pagination and trigger API fetches with updated query params. No API changes needed.

**Tech Stack:** Next.js 14, TanStack Table v8, shadcn/ui (Calendar, Popover, Select, Table, Button), date-fns

---

## File Map

| File | Action |
|------|--------|
| `package.json` | Add `@tanstack/react-table` |
| `components/ui/calendar.tsx` | Add via shadcn |
| `components/ui/popover.tsx` | Add via shadcn |
| `components/transactions/FilterBar.tsx` | Create |
| `components/transactions/TransactionTable.tsx` | Create |
| `app/finance/transactions/page.tsx` | Modify |
| `components/transactions/TransactionList.tsx` | Delete (replaced by TransactionTable) |

---

## Tasks

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add TanStack Table**

Run: `npm install @tanstack/react-table`

- [ ] **Step 2: Add shadcn calendar**

Run: `npx shadcn@latest add calendar`

- [ ] **Step 3: Add shadcn popover**

Run: `npx shadcn@latest add popover`

- [ ] **Step 4: Verify calendar and popover installed**

Run: `ls components/ui/calendar.tsx components/ui/popover.tsx`
Expected: Both files exist

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json components/ui/calendar.tsx components/ui/popover.tsx
git commit -m "feat: add tanstack table and date picker components"
```

---

### Task 2: Create FilterBar Component

**Files:**
- Create: `components/transactions/FilterBar.tsx`

- [ ] **Step 1: Create FilterBar with DateRange and Category filters**

```typescript
'use client';

import { useState } from 'react';
import { format, set } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Category {
  id: string;
  name: string;
  color: string;
}

interface FilterState {
  startDate: Date | undefined;
  endDate: Date | undefined;
  category: string | undefined;
}

interface FilterBarProps {
  categories: Category[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

export function FilterBar({ categories, filters, onFilterChange }: FilterBarProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: filters.startDate,
    to: filters.endDate,
  });
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    onFilterChange({
      ...filters,
      startDate: range.from,
      endDate: range.to,
    });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({
      ...filters,
      category: value === 'all' ? undefined : value,
    });
  };

  const clearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    onFilterChange({ startDate: undefined, endDate: undefined, category: undefined });
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.category;

  const dateRangeDisplay = dateRange.from
    ? dateRange.to
      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
      : `${format(dateRange.from, 'MMM d, yyyy')} – Select end date`
    : 'Select date range';

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-[240px] justify-start text-left font-normal ${!dateRange.from && 'text-muted-foreground'}`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRangeDisplay}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
            disabled={(date) => date > new Date()}
          />
        </PopoverContent>
      </Popover>

      <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
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
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/transactions/FilterBar.tsx
git commit -m "feat: create FilterBar component for date and category filtering"
```

---

### Task 3: Create TransactionTable Component (TanStack Table)

**Files:**
- Create: `components/transactions/TransactionTable.tsx`

- [ ] **Step 1: Create TransactionTable using TanStack Table**

```typescript
'use client';

import { useState } from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
};

interface Category {
  id: string;
  name: string;
  color: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (transactionId: string, category: string | undefined) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  sorting,
  onSortingChange,
}: TransactionTableProps) {
  const [updating, setUpdating] = useState<string | null>(null);

  const handleCategoryChange = async (
    transactionId: string,
    value: string
  ) => {
    setUpdating(transactionId);
    await onCategoryChange(
      transactionId,
      value === 'uncategorized' ? undefined : value
    );
    setUpdating(null);
  };

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => format(new Date(row.original.date), 'MMM dd, yyyy'),
    },
    {
      accessorKey: 'merchant',
      header: 'Merchant',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.merchant}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.description}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span
          className={
            row.original.type === 'CREDIT'
              ? 'text-green-600'
              : 'text-red-600'
          }
          title={
            row.original.originalCurrency
              ? `${row.original.originalCurrency} ${row.original.originalAmount?.toFixed(2)} @ ${row.original.exchangeRate?.toFixed(4)}`
              : undefined
          }
        >
          {row.original.type === 'CREDIT' ? '+' : '-'}RM{' '}
          {row.original.amount.toFixed(2)}
        </span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <Select
          value={row.original.category || 'uncategorized'}
          onValueChange={(value) => handleCategoryChange(row.original.id, value)}
          disabled={updating === row.original.id}
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
          </SelectContent>
        </Select>
      ),
    },
  ];

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/transactions/TransactionTable.tsx
git commit -m "feat: create TransactionTable with tanstack table"
```

---

### Task 4: Update TransactionsPage to Use FilterBar and TransactionTable

**Files:**
- Modify: `app/finance/transactions/page.tsx`
- Delete: `components/transactions/TransactionList.tsx`

- [ ] **Step 1: Update page imports and state**

Replace current imports with:

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionTable } from '@/app/components/transactions/TransactionTable';
import { FilterBar } from '@/app/components/transactions/FilterBar';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SortingState } from '@tanstack/react-table';
```

Add filter state alongside existing state:

```typescript
const [filters, setFilters] = useState({
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
  category: undefined as string | undefined,
});
const [sorting, setSorting] = useState<SortingState>([]);
```

- [ ] **Step 2: Update fetchData to include filter params**

Inside `fetchData`, update the URLSearchParams:

```typescript
const params = new URLSearchParams({
  page: String(currentPage),
  limit: '50',
});
if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
if (filters.endDate) params.set('endDate', filters.endDate.toISOString());
if (filters.category) params.set('category', filters.category);
```

- [ ] **Step 3: Add filter handler that resets pagination**

```typescript
const handleFilterChange = (newFilters: typeof filters) => {
  setFilters(newFilters);
  setCurrentPage(1);
};
```

- [ ] **Step 4: Update useEffect dependencies**

Change `useEffect` dependency array to include `filters`:

```typescript
useEffect(() => {
  setLoading(true);
  fetchData();
}, [fetchData]); // fetchData already depends on filters and currentPage
```

- [ ] **Step 5: Replace table and add filter bar in JSX**

In the CardContent, replace the table section with:

```tsx
<CardHeader>
  <div className="flex flex-wrap items-center justify-between gap-4">
    <CardTitle>All Transactions</CardTitle>
    <FilterBar
      categories={categories}
      filters={filters}
      onFilterChange={handleFilterChange}
    />
  </div>
</CardHeader>
<CardContent>
  <div className="mb-4">
    <span className="text-sm text-muted-foreground">
      Page {currentPage} of {totalPages} ({total} total)
    </span>
  </div>

  <TransactionTable
    transactions={transactions}
    categories={categories}
    onCategoryChange={handleCategoryChange}
    sorting={sorting}
    onSortingChange={setSorting}
  />

  <Pagination className="mt-4">
    {/* keep existing pagination JSX */}
  </Pagination>
</CardContent>
```

- [ ] **Step 6: Delete old TransactionList.tsx**

Run: `rm components/transactions/TransactionList.tsx`

- [ ] **Step 7: Commit**

```bash
git add app/finance/transactions/page.tsx
git rm components/transactions/TransactionList.tsx
git commit -m "feat: integrate filterbar and tanstack table into transactions page"
```

---

### Task 5: Verify End-to-End

**Files:**
- None (testing)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate to transactions page**

Open: `http://localhost:3000/finance/transactions`

- [ ] **Step 3: Test date filter**

1. Click date range button → calendar opens
2. Select a date range (e.g., Mar 1 – Mar 15)
3. Verify transactions table updates with filtered results
4. Verify page resets to 1

- [ ] **Step 4: Test category filter**

1. Open category dropdown
2. Select a category
3. Verify only transactions from that category show
4. Verify page resets to 1

- [ ] **Step 5: Test combined filters**

1. Set date range AND category filter
2. Verify both filters apply together
3. Verify count matches

- [ ] **Step 6: Test clear button**

1. Click "Clear" button
2. Verify all transactions load
3. Verify filters reset visually

- [ ] **Step 7: Test inline category editing**

1. Click category select on a transaction row
2. Change category
3. Verify update persists

- [ ] **Step 8: Verify no console errors**

Open browser DevTools → Console → no red errors

---

### Task 6: Final Review

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit any remaining changes**

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| Date range filter | Task 2, Task 4 |
| Category filter | Task 2, Task 4 |
| FilterBar component | Task 2 |
| TransactionTable with TanStack | Task 3 |
| Server-side filtering via API | Task 4 |
| Filter resets pagination | Task 4 |
| Clear filters button | Task 2 |
| Inline category editing preserved | Task 3 |
| Shadcn calendar + popover | Task 1 |

**All spec requirements covered.** No gaps.
