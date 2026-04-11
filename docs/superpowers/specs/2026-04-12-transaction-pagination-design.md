# Transaction Monthly Pagination

## Summary

Add pagination to the transactions page with month-aware navigation, showing up to 50 transactions per page with a maximum of 20 pages (1,000 transactions).

## API Changes

### GET /api/transactions

**Query Parameters:**
- `page` (number, default: 1) — Current page number
- `limit` (number, default: 50) — Transactions per page
- `startDate`, `endDate`, `category`, `type` — Existing filters

**Response:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

### Files to Modify
- `app/api/transactions/route.ts` — Parse `page` param, return count metadata

---

## Frontend Changes

### Pagination Controls

Use shadcn `Pagination` component:
- `PaginationContent`, `PaginationItem`, `PaginationLink`, `PaginationPrevious`, `PaginationNext`, `PaginationEllipsis`

**Layout:**
```
<<<  1  2  3 ... 20  >>>
     [50 per page]
```

**Behavior:**
- Shows first 3 page numbers, ellipsis, last page
- "Previous" / "Next" buttons for navigation
- Click page number to jump directly
- Monthly context displayed above the table (e.g., "April 2026")

### Month Navigation

- Prev/Next month buttons alongside pagination
- Arrow buttons to navigate between months
- Pagination resets to page 1 when month changes

### Files to Modify
- `app/transactions/page.tsx` — Add month state, pagination controls
- `app/components/transactions/TransactionList.tsx` — Accept pagination props, pass through

---

## Implementation Plan

1. Update `GET /api/transactions` to accept `page` param and return `{ data, total, page, limit, totalPages }`
2. Update `lib/transactions.ts` `getTransactions` to return count metadata
3. Add shadcn Pagination component if not present
4. Update `app/transactions/page.tsx` with:
   - Month state for navigation
   - Page state for pagination
   - Fetch data with month/page params
5. Add month selector (prev/next arrows + month/year label)
6. Add pagination controls below transaction list