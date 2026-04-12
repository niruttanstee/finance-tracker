# Transaction Pagination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add month-aware pagination to the transactions page, showing up to 50 transactions per page with a maximum of 20 pages.

**Architecture:** Backend returns `{ data, total, page, limit, totalPages }` from a new `page` query param. Frontend maintains month+page state, fetches filtered data, and renders shadcn Pagination controls with prev/next month navigation.

**Tech Stack:** Next.js 14, TypeScript, shadcn/ui Pagination component, Drizzle ORM, SQLite

---

## File Map

| File | Responsibility |
|------|----------------|
| `lib/transactions.ts` | Modify `getTransactions` to return count alongside data |
| `app/api/transactions/route.ts` | Parse `page` param, return pagination metadata |
| `components/ui/pagination.tsx` | Create: shadcn Pagination component |
| `app/transactions/page.tsx` | Add month+page state, fetch with params, render controls |

---

## Tasks

### Task 1: Install shadcn Pagination component

Check if already installed:
- [ ] **Step 1: Check if pagination exists**
  Run: `ls /Users/nirutt/Documents/Code/finance-tracker/components/ui/pagination.tsx`
  Expected: File not found (proceed to install)

- [ ] **Step 2: Install pagination component**
  Run: `cd /Users/nirutt/Documents/Code/finance-tracker && npx shadcn@latest add pagination`
  Expected: Creates `components/ui/pagination.tsx`

- [ ] **Step 3: Commit**
  Run: `git add components/ui/pagination.tsx package.json && git commit -m "feat: add shadcn pagination component"`

---

### Task 2: Update lib/transactions.ts to return count

- [ ] **Step 1: Read current lib/transactions.ts**

- [ ] **Step 2: Modify `getTransactions` return type**

The function currently returns `Promise<Transaction[]>`. Change to return a named struct:

```typescript
export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
}

// In getTransactions:
return db.query.transactions.findMany({
  where: whereClause,
  orderBy: [desc(transactions.date)],
  limit,
  offset,
});
```

Wait — `findMany` doesn't return count. You need to run two queries: one for data, one for count.

```typescript
export async function getTransactions(
  userId: string,
  filters?: TransactionFilters,
  limit = 50,
  offset = 0
): Promise<PaginatedTransactions> {
  const conditions = [eq(transactions.userId, userId)];

  if (filters?.startDate) conditions.push(gte(transactions.date, filters.startDate));
  if (filters?.endDate) conditions.push(lte(transactions.date, filters.endDate));
  if (filters?.category) conditions.push(eq(transactions.category, filters.category));
  if (filters?.type) conditions.push(eq(transactions.type, filters.type));

  const whereClause = and(...conditions);

  const [transactionsResult, countResult] = await Promise.all([
    db.query.transactions.findMany({
      where: whereClause,
      orderBy: [desc(transactions.date)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(transactions).where(whereClause),
  ]);

  return {
    transactions: transactionsResult,
    total: countResult[0]?.count || 0,
  };
}
```

- [ ] **Step 3: Update callers of getTransactions**

`app/api/transactions/route.ts` calls `getTransactions` — update to destructure `{ transactions, total }`.

- [ ] **Step 4: Commit**
  Run: `git add lib/transactions.ts app/api/transactions/route.ts && git commit -m "refactor: getTransactions returns paginated result with count"`

---

### Task 3: Update API route to parse `page` and return metadata

- [ ] **Step 1: Read current `app/api/transactions/route.ts`**

- [ ] **Step 2: Rewrite GET handler**

```typescript
export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      category: searchParams.get('category') || undefined,
      type: (searchParams.get('type') as 'DEBIT' | 'CREDIT') || undefined,
    };

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const { transactions, total } = await getTransactions(userId, filters, limit, offset);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: transactions,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**
  Run: `git add app/api/transactions/route.ts && git commit -m "feat(api): add page param and pagination metadata"`

---

### Task 4: Add shadcn Pagination to page.tsx

- [ ] **Step 1: Read current `app/transactions/page.tsx`**

- [ ] **Step 2: Add imports**
```typescript
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';
```

- [ ] **Step 3: Add state for currentMonth and currentPage**
```typescript
const [currentMonth, setCurrentMonth] = useState(() => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
});
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
```

- [ ] **Step 4: Update fetchData to pass month+page**
```typescript
const year = currentMonth.year;
const month = currentMonth.month;
const startDate = new Date(year, month, 1);
const endDate = new Date(year, month + 1, 0); // last day of month

const params = new URLSearchParams({
  startDate: startDate.toISOString(),
  endDate: endDate.toISOString(),
  page: String(currentPage),
  limit: '50',
});

const transactionsRes = await fetch(`/api/transactions?${params}`);
const transactionsData = await transactionsRes.json();
setTransactions(transactionsData.data || []);
setTotalPages(transactionsData.totalPages || 1);
```

- [ ] **Step 5: Add month navigation and pagination UI**

Add above the table:
```tsx
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="icon"
      onClick={() => navigateMonth(-1)}
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <span className="font-medium min-w-[120px] text-center">
      {new Date(currentMonth.year, currentMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
    </span>
    <Button
      variant="outline"
      size="icon"
      onClick={() => navigateMonth(1)}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
  <span className="text-sm text-muted-foreground">
    Page {currentPage} of {totalPages}
  </span>
</div>
```

Add pagination below the table:
```tsx
<Pagination className="mt-4">
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
      />
    </PaginationItem>
    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(page => (
      <PaginationItem key={page}>
        <PaginationLink
          isActive={page === currentPage}
          onClick={() => setCurrentPage(page)}
        >
          {page}
        </PaginationLink>
      </PaginationItem>
    ))}
    {totalPages > 5 && <PaginationEllipsis />}
    <PaginationItem>
      <PaginationNext
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
      />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

- [ ] **Step 6: Add `navigateMonth` function**
```typescript
function navigateMonth(delta: number) {
  setCurrentMonth(prev => {
    let month = prev.month + delta;
    let year = prev.year;
    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }
    return { year, month };
  });
  setCurrentPage(1); // reset to first page on month change
}
```

- [ ] **Step 7: Add useEffect to re-fetch when month/page changes**
```typescript
useEffect(() => {
  fetchData();
}, [currentMonth, currentPage]);
```

- [ ] **Step 8: Commit**
  Run: `git add app/transactions/page.tsx && git commit -m "feat: add month-aware pagination to transactions page"`

---

### Task 5: Verify end-to-end

- [ ] **Step 1: Start dev server**
  Run: `cd /Users/nirutt/Documents/Code/finance-tracker && npm run dev`

- [ ] **Step 2: Open transactions page**
  Navigate to: `http://localhost:3000/transactions`

- [ ] **Step 3: Verify pagination renders**
  - Month selector shows current month
  - Prev/Next arrows navigate months
  - Page numbers display below table
  - Prev/Next page buttons work

- [ ] **Step 4: Test edge cases**
  - Clicking previous month resets to page 1
  - Page nav disabled correctly at boundaries
  - Month changes trigger data re-fetch

---

## Self-Review

- [ ] Spec coverage: All spec requirements mapped to tasks
- [ ] No placeholders: All code is complete, no "TBD" or "TODO"
- [ ] Type consistency: `page`, `limit`, `total`, `totalPages` consistently named across API and frontend
- [ ] shadcn Pagination used correctly with all required sub-components

**Plan complete and saved to `docs/superpowers/plans/2026-04-12-transaction-pagination-plan.md`.**