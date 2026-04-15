# Transaction Filtering — Design Spec

**Date:** 2026-04-15
**Status:** Approved

## Overview

Add date range and category filtering to the Transactions page using TanStack Table with shadcn UI components. Filters are server-side — they update API query params and reset pagination.

---

## Architecture

**Hybrid approach** — TanStack Table for table rendering, shadcn components for filter controls, existing API for server-side filtering.

```
FilterBar (client state)
    │
    │ onFilterChange({ startDate, endDate, category })
    ▼
TransactionsPage
    │
    │ fetchData() with filter params
    ▼
GET /api/transactions?startDate=...&endDate=...&category=...&page=1&limit=50
    │
    ▼
TanStack Table renders results
```

**No API changes required** — the `/api/transactions` endpoint already supports `startDate`, `endDate`, and `category` query params.

---

## Component Changes

### New Files

| File | Purpose |
|------|---------|
| `components/transactions/FilterBar.tsx` | Date range + category filter controls |
| `components/transactions/TransactionTable.tsx` | TanStack Table wrapper (replaces `TransactionList.tsx` inline table rendering) |

### Modified Files

| File | Change |
|------|--------|
| `app/finance/transactions/page.tsx` | Add filter state, integrate `FilterBar` and `TransactionTable` |
| `components/transactions/TransactionList.tsx` | **Deleted** — logic merged into `TransactionTable.tsx` |

### Shadcn Dependencies

```bash
npx shadcn@latest add calendar popover    # date picker (if not already installed)
npm install @tanstack/react-table        # table core
```

---

## FilterBar Component

### Props

```typescript
interface FilterBarProps {
  categories: Category[];
  filters: {
    startDate: Date | undefined;
    endDate: Date | undefined;
    category: string | undefined;
  };
  onFilterChange: (filters: FilterBarProps['filters']) => void;
}
```

### Controls

1. **Date Range** — Shadcn `Popover` + `Calendar` for date selection
   - Displays "Mar 1 – Mar 31, 2026" when range is set
   - User selects start and end dates via calendar UI
   - Clears via "Clear" button or individual date removal

2. **Category** — Shadcn `Select` dropdown
   - Default: "All Categories"
   - Options populated from `categories` prop
   - Value: category name string or `undefined`

3. **Clear Filters** — `Button` variant="ghost"
   - Resets all three filter fields to `undefined`
   - Triggers `onFilterChange` to reload all data

### Layout

```
<div className="flex flex-wrap gap-2 items-center">
  <Popover with={DateRangePicker} />
  <Select category options />
  <Button variant="ghost" onClick={clearFilters}>Clear</Button>
</div>
```

---

## TransactionTable Component

### Props

```typescript
interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  onCategoryChange: (transactionId: string, category: string | undefined) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}
```

### Columns

| Column | Filterable | Sortable |
|--------|-----------|----------|
| Date | Yes (via FilterBar date range) | Yes |
| Merchant | No | Yes |
| Amount | No | Yes |
| Category | Yes (via FilterBar category select) | No |

- Date column uses `format(new Date(row.date), 'MMM dd, yyyy')`
- Amount column: green for CREDIT, red for DEBIT
- Category column: inline `Select` for editing (existing behavior)

---

## Page Changes (TransactionsPage)

### State

```typescript
const [filters, setFilters] = useState({
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
  category: undefined as string | undefined,
});
const [currentPage, setCurrentPage] = useState(1);
```

### fetchData with Filters

```typescript
const fetchData = useCallback(async () => {
  const params = new URLSearchParams({
    page: String(currentPage),
    limit: '50',
  });
  if (filters.startDate) params.set('startDate', filters.startDate.toISOString());
  if (filters.endDate) params.set('endDate', filters.endDate.toISOString());
  if (filters.category) params.set('category', filters.category);
  // ...
}, [currentPage, filters]);
```

### Filter → Reset Pagination

```typescript
const handleFilterChange = (newFilters: typeof filters) => {
  setFilters(newFilters);
  setCurrentPage(1); // Always reset to page 1 on filter change
};
```

---

## Data Flow

1. User changes filter in `FilterBar` → `onFilterChange(filters)` called
2. `TransactionsPage` updates `filters` state + resets `currentPage = 1`
3. `useEffect` on `[currentPage, fetchData]` triggers new API fetch
4. API returns filtered, paginated results
5. `TransactionTable` re-renders with new data

---

## Pagination

Existing pagination component and logic preserved. Pagination is filter-aware — changing filters always resets to page 1.

---

## Error Handling

- Filter errors silently logged to console
- Empty filter state shows all transactions
- Invalid date ranges handled by API (returns empty array)

---

## Testing Checklist

- [ ] Date range filter returns correct subset of transactions
- [ ] Category filter returns correct subset
- [ ] Combined filters (date + category) work together
- [ ] Clear button resets all filters and reloads all data
- [ ] Pagination resets to page 1 when filters change
- [ ] Inline category editing still works
- [ ] Loading state displays correctly during filter change
- [ ] No console errors during filter operations
