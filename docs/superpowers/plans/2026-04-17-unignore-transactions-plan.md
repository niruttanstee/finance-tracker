# Un-Ignore Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to un-ignore transactions by selecting any category from the dropdown — keeping the category Select always visible even when a transaction is ignored.

**Architecture:** Modify the `category` column cell renderer in `TransactionTable.tsx` to always render the category Select. When `ignored === true`, set the Select's value to `"__ignored__"`. On any category selection (including "Uncategorized"), call `onIgnoreTransaction(id, false)` to un-ignore.

**Tech Stack:** React, TypeScript, shadcn/ui Select, TanStack Table

---

## Task 1: Update `handleCategoryChange` to un-ignore on any category selection

**Files:**
- Modify: `components/transactions/TransactionTable.tsx:70-86`

- [ ] **Step 1: Update `handleCategoryChange` function**

Replace the current function with:

```typescript
const handleCategoryChange = async (
  transactionId: string,
  value: string | null
) => {
  setUpdating(transactionId);

  if (value === '__ignored__') {
    await onIgnoreTransaction(transactionId, true);
  } else {
    // Un-ignore when any category is selected
    await onCategoryChange(
      transactionId,
      !value || value === 'uncategorized' ? undefined : value
    );
    await onIgnoreTransaction(transactionId, false);
  }

  setUpdating(null);
};
```

- [ ] **Step 2: Run tests to verify no breakage**

Run: `npm test -- tests/transactions.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add components/transactions/TransactionTable.tsx
git commit -m "feat: un-ignore transaction on any category selection"
```

---

## Task 2: Update category column cell to always render Select

**Files:**
- Modify: `components/transactions/TransactionTable.tsx:127-166`

- [ ] **Step 1: Update category column cell renderer**

Replace the current cell renderer with:

```typescript
{
  accessorKey: 'category',
  header: 'Category',
  cell: ({ row }) => (
    <Select
      value={row.original.ignored ? '__ignored__' : (row.original.category || 'uncategorized')}
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
        <SelectItem value="__ignored__">Ignored</SelectItem>
      </SelectContent>
    </Select>
  ),
},
```

- [ ] **Step 2: Run tests — update failing test**

The test "shows Ignored badge instead of select for ignored transactions" at line 112-130 will now fail because we always render the Select. Update it:

```typescript
it('shows Ignored value in select for ignored transactions', () => {
  const transactions = [createMockTransaction({ ignored: true })];

  render(
    <TransactionTable
      transactions={transactions}
      categories={mockCategories}
      onCategoryChange={mockOnCategoryChange}
      onIgnoreTransaction={mockOnIgnoreTransaction}
      sorting={[]}
      onSortingChange={vi.fn()}
    />
  );

  // Should show a select dropdown (not a badge)
  expect(screen.queryByRole('combobox')).toBeInTheDocument();
  // Should show "Ignored" text in the select trigger
  expect(screen.getByText('Ignored')).toBeInTheDocument();
});
```

Run: `npm test -- tests/transactions.test.tsx`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add components/transactions/TransactionTable.tsx tests/transactions.test.tsx
git commit -m "feat: always show category select for ignored transactions"
```

---

## Verification

1. Start dev server: `npm run dev`
2. Navigate to transactions page
3. Find an ignored transaction (shows EyeOff badge)
4. Click the category dropdown on that row
5. Select any category (e.g., "Food & Dining")
6. Transaction should be un-ignored and category should be set
7. Verify `ignored` is `false` in database or API response
