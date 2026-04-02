# Rolling Budget Implementation Plan

## Goal
Implement rolling budgets where savings carry forward month-to-month with automatic cascade recalculation.

## Architecture Overview

### Data Flow
```
Category.defaultBudget (source of truth)
    ↓
Month 1: budget = defaultBudget + previous_savings
    ↓
Month 2: budget = defaultBudget + Month1.savings  
    ↓
Month 3: budget = defaultBudget + Month2.savings
    ↓
... (cascades forward)
```

### Trigger Points for Cascade Recalculation
1. **Category default budget changed** → Recalculate ALL months from earliest budget forward
2. **Specific month budget manually edited** → Recalculate that month + all future months
3. **Transaction added/modified/deleted** → Recalculate next month's budget only

---

## Implementation Steps

### Phase 1: Database Schema Update
**Files:** `lib/schema.ts`

1. Add `defaultBudget` column to categories table
2. Create migration to add column and populate with existing values
3. Update TypeScript types

```typescript
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  defaultBudget: real('default_budget').notNull().default(0), // NEW
});
```

### Phase 2: Core Budget Logic Enhancement
**Files:** `lib/budgets.ts`

#### New Functions Needed:

1. **`calculateRolloverAmount(categoryId, yearMonth)`**
   - Returns savings from previous month (max(0, budget - spent))
   - Returns 0 if no previous month or overspent

2. **`getOrCreateBudgetWithRollover(categoryId, yearMonth)`**
   - Check if budget exists
   - If not, calculate with rollover from previous month
   - Save and return

3. **`cascadeRecalculateFromMonth(categoryId, startYearMonth)`**
   - Recalculate budget for startYearMonth using previous month's actuals
   - Then recalculate all subsequent months
   - Each month uses: `defaultBudget + previous_month_savings`

4. **`recalculateAllBudgets(categoryId)`**
   - Find earliest budget month
   - Cascade recalculate from there

### Phase 3: API Endpoint Updates

#### Update `app/api/budgets/route.ts`:

**GET** - Add automatic rollover creation:
```typescript
// When fetching budgets for a month, auto-create with rollover if missing
for each category:
  budget = getOrCreateBudgetWithRollover(categoryId, yearMonth)
```

**POST** - Trigger cascade recalculation:
```typescript
// After updating a budget:
await cascadeRecalculateFromMonth(categoryId, yearMonth)
```

#### New Endpoint `app/api/budgets/recalculate/route.ts`:

**POST** `/api/budgets/recalculate`
```typescript
Body: { categoryId: string }
Action: Recalculate all budgets for this category from earliest month forward
Response: { success: true, monthsUpdated: number }
```

### Phase 4: Settings Page Updates
**Files:** `app/settings/page.tsx`, `app/components/settings/CategoryManager.tsx`

1. Add "Default Budget" input field for each category
2. On save:
   - Update category.defaultBudget
   - Trigger cascade recalculation for all months
3. Show loading state during recalculation

### Phase 5: Budgets Page Updates
**Files:** `app/budgets/page.tsx`, `app/components/budgets/BudgetCard.tsx`

1. Add indicator showing rollover amount ("+250 MYR from last month")
2. Show total budget breakdown: base + rollover = total
3. When manually editing a month's budget:
   - Save the new value
   - Update category.defaultBudget (new default for future)
   - Trigger cascade recalculation

### Phase 6: Transaction Change Hooks
**Files:** `lib/transactions.ts`, `app/api/transactions/route.ts`

After any transaction CRUD operation:
1. Determine the transaction's month (yearMonth)
2. Find the next month
3. Recalculate next month's budget

Example:
```typescript
// After updating a transaction:
const transactionMonth = getYearMonth(transaction.date)
const nextMonth = addOneMonth(transactionMonth)
await recalculateBudgetForMonth(categoryId, nextMonth)
```

### Phase 7: Utility Functions
**Files:** `lib/budgets.ts`

Helper functions:
- `getPreviousYearMonth(yearMonth)` → "2025-03" → "2025-02"
- `getNextYearMonth(yearMonth)` → "2025-03" → "2025-04"
- `parseYearMonth(yearMonth)` → { year: 2025, month: 3 }

---

## Detailed Implementation

### Function: calculateRolloverAmount
```typescript
export async function calculateRolloverAmount(
  categoryId: string,
  yearMonth: string
): Promise<number> {
  const prevMonth = getPreviousYearMonth(yearMonth);
  
  // Get previous month's budget and spending
  const prevBudget = await getBudgetForCategory(categoryId, prevMonth);
  if (!prevBudget) return 0;
  
  const spent = await getSpendingForCategory(categoryId, prevMonth);
  const savings = prevBudget.monthlyLimit - spent;
  
  return Math.max(0, savings); // No negative rollover (debt)
}
```

### Function: cascadeRecalculateFromMonth
```typescript
export async function cascadeRecalculateFromMonth(
  categoryId: string,
  startYearMonth: string
): Promise<number> {
  const category = await getCategory(categoryId);
  let monthsUpdated = 0;
  let currentMonth = startYearMonth;
  
  while (await budgetExistsForMonth(categoryId, currentMonth)) {
    // Calculate this month's budget
    const rollover = await calculateRolloverAmount(categoryId, currentMonth);
    const newBudget = category.defaultBudget + rollover;
    
    // Update budget
    await updateBudgetLimit(categoryId, currentMonth, newBudget);
    monthsUpdated++;
    
    // Move to next month
    currentMonth = getNextYearMonth(currentMonth);
  }
  
  return monthsUpdated;
}
```

---

## Testing Strategy

### Unit Tests
1. `calculateRolloverAmount` - various scenarios (under/over budget, no prev month)
2. `cascadeRecalculateFromMonth` - verify chain updates correctly
3. Edge cases: year boundaries (Dec → Jan)

### Integration Tests
1. Change default budget → verify cascade updates all months
2. Edit month budget → verify future months update
3. Add transaction → verify next month recalculates
4. Multiple categories - ensure independence

### Manual Testing
1. Set up 3 months of budgets with varying spending
2. Change default budget, verify cascade
3. Edit middle month, verify forward cascade only
4. Add transaction, verify next month updates
5. Overspend scenario - verify reset to default

---

## Migration Plan

1. **Backup database** before migration
2. **Add column** `default_budget` to categories
3. **Populate** default_budget from most recent month's budget per category (or 0)
4. **Recalculate all budgets** for all categories to establish rollover chain

---

## Rollback Plan

If issues arise:
1. Restore database from backup
2. Or revert code and set all budgets to fixed values

---

## Success Criteria

- [ ] Savings automatically carry forward to next month
- [ ] Overspending resets to default budget next month
- [ ] Manual budget edits cascade to future months
- [ ] Default budget changes cascade to all months
- [ ] Transaction changes trigger next-month recalculation
- [ ] UI clearly shows rollover amounts
- [ ] Performance acceptable (< 2s for cascade recalculation)

---

## Open Questions

1. **Performance**: For users with 12+ months of history, cascade recalculation could be slow. Should we optimize with batch updates?
2. **Partial months**: How to handle the current month? Should we use projected savings or actual-so-far?
3. **Deleted categories**: What happens to their budget history?
