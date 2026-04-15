# Design: Delete Default Categories + Ignore Transactions

**Date:** 2026-04-15
**Status:** Draft

---

## 1. Overview

Two related quality-of-life features:

1. **Delete Default Categories** — Allow deletion of default (seeded) categories, with a warning dialog if the category is currently assigned to transactions.
2. **Ignore Transactions** — Allow users to mark transactions as "ignored"; ignored transactions are excluded from all spending totals, statistics, and budget calculations but retain their category for potential future un-ignore.

---

## 2. Delete Default Categories

### 2.1 Database & API

- **`lib/categories.ts` — `deleteCategory`**: Remove the `isDefault` guard that throws `Cannot delete default categories`.
- **`DELETE /api/categories`**: No structural changes — the route already calls `deleteCategory`. Error responses pass through unchanged.
- **Usage check**: Before deleting, count transactions with this category name. If count > 0, throw an error with shape `{ error: 'in_use', count: N }`.

### 2.2 UI Flow

1. User clicks Trash2 on any category row (default or custom).
2. Front-end calls `DELETE /api/categories?id=<id>`.
3. If the API returns `{ error: 'in_use', count: N }`:
   - Show shadcn `<AlertDialog>` with the count embedded in the message.
   - Dialog: "Delete Category?" / "This category is assigned to N transactions. They will become uncategorized." / [Cancel] [Delete].
   - "Delete" button in the dialog calls `DELETE /api/categories?id=<id>&force=true`.
4. If no usage (count === 0): delete immediately, no dialog.

### 2.3 Component Changes

- **`app/components/settings/CategoryManager.tsx`**: Remove `!category.isDefault &&` guard around delete button — all categories now deletable. Add AlertDialog import and state.

---

## 3. Ignore Transactions

### 3.1 Database

- **`lib/schema.ts`**: Add `ignored: boolean('ignored').notNull().default(false)` to `transactions` table.

### 3.2 API

- **`GET /api/transactions`**: Add `eq(transactions.ignored, false)` condition to the where clause so ignored transactions are never returned in list queries.
- **`PATCH /api/transactions`**: Accept `{ id, ignored: boolean }` in addition to `{ id, category }`. Update the transaction's `ignored` field.

### 3.3 Ignored-Filtered Queries

All statistical queries must exclude ignored transactions:

- **`lib/transactions.ts` — `getTransactions`**: Add ignored filter.
- **`lib/transactions.ts` — `getMonthlySpending`**: Add ignored filter.
- **`lib/transactions.ts` — `getCategoryBreakdown`**: Add ignored filter.
- **`lib/transactions.ts` — `getUncategorizedCount`**: Add ignored filter.
- **`lib/budgets.ts` — `getSpendingForCategory`**: Add ignored filter.
- **`lib/dashboard.ts` — `getDashboardData`**: The existing queries already filter by type; add ignored filter to all transaction joins/subselects.

### 3.4 UI — Category Select

- **`TransactionList.tsx`**: Add "Ignored" `<SelectItem>` at bottom of the category dropdown (above or below "Uncategorized").
- On select, call PATCH with `{ id, ignored: true }`.
- Ignored transactions render differently: muted text color, dimmed merchant, small eye-slash icon.

### 3.5 UI — Transaction Row

```tsx
<TableRow key={transaction.id} className={transaction.ignored ? 'opacity-50' : ''}>
  ...
  <TableCell>
    {transaction.ignored ? (
      <div className="flex items-center gap-1 text-muted-foreground">
        <EyeOff className="h-4 w-4" />
        <span className="text-sm">Ignored</span>
      </div>
    ) : (
      <Select ...>...</Select>
    )}
  </TableCell>
</TableRow>
```

---

## 4. Summary of Changes

| File | Change |
|------|--------|
| `lib/schema.ts` | Add `ignored` column |
| `lib/categories.ts` | Remove `isDefault` guard on delete; add usage count check |
| `lib/transactions.ts` | Add ignored filter to all query functions |
| `lib/budgets.ts` | Add ignored filter to `getSpendingForCategory` |
| `lib/dashboard.ts` | Add ignored filter to dashboard aggregation queries |
| `app/api/transactions/route.ts` | Filter ignored in GET; support `ignored` in PATCH body |
| `app/components/settings/CategoryManager.tsx` | Show delete for all categories; add AlertDialog |
| `app/components/transactions/TransactionList.tsx` | Add Ignored option to select; conditional row rendering |
| `app/finance/transactions/page.tsx` | No changes needed (state update handles it) |

---

## 5. Out of Scope

- Un-ignore action (can be added later; ignored transactions stay in DB)
- Bulk ignore
- "Ignored" category visible in dropdowns
