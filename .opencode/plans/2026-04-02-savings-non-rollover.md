# Savings Non-Rollover Budget Implementation Plan

> **Status:** ✅ **COMPLETED**

**Goal:** Implement a `noRollover` flag for categories (specifically "Savings") that prevents budget rollover from previous months.

**Architecture:** Add a boolean `noRollover` column to the categories table. Modify the `calculateRolloverAmount()` function to return 0 for categories marked as `noRollover`. Update the settings UI to allow toggling this flag per category.

**Tech Stack:** Next.js 14, Drizzle ORM, SQLite, React/TypeScript, shadcn/ui

---

### Task 1: Update Database Schema

**Status:** ✅ COMPLETED

**Files:**
- Modify: `lib/schema.ts:20-26`

**Changes Made:**

Added `noRollover` column to categories table:

```typescript
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  defaultBudget: real('default_budget').notNull().default(0),
  noRollover: integer('no_rollover', { mode: 'boolean' }).notNull().default(false),
});
```

**Commit:**
```bash
git add lib/schema.ts
git commit -m "feat: add noRollover column to categories schema"
```

---

### Task 2: Create Database Migration Script

**Status:** ✅ COMPLETED

**Files:**
- Create: `scripts/migrate-no-rollover.ts`

**Changes Made:**

Created migration script that:
1. Adds `no_rollover` column to categories table
2. Automatically sets `noRollover=true` for Savings category if exists
3. Shows current state after migration

**Script Location:** `scripts/migrate-no-rollover.ts`

**Commit:**
```bash
git add scripts/migrate-no-rollover.ts
git commit -m "feat: add migration script for noRollover column"
```

---

### Task 3: Update Budget Calculation Logic

**Files:**
- Modify: `lib/budgets.ts:72-89`
- Modify: `lib/budgets.ts:140-155`

**Step 1: Update calculateRolloverAmount to check noRollover flag**

Modify lines 72-89:

```typescript
// Calculate rollover amount from previous month
export async function calculateRolloverAmount(
  categoryId: string,
  categoryName: string,
  yearMonth: string
): Promise<number> {
  // Get category to check if rollover is disabled
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  
  // If category has noRollover flag, don't calculate rollover
  if (category?.noRollover) {
    return 0;
  }
  
  const prevMonth = getPreviousYearMonth(yearMonth);
  
  // Get previous month's budget
  const prevBudget = await getBudgetForCategory(categoryId, prevMonth);
  if (!prevBudget) return 0;
  
  // Get previous month's spending
  const spent = await getSpendingForCategory(categoryName, prevMonth);
  const savings = prevBudget.monthlyLimit - spent;
  
  return Math.max(0, savings); // No negative rollover (debt)
}
```

**Step 2: Update cascadeRecalculateFromMonth to skip recalculation for noRollover categories**

Modify lines 140-155:

```typescript
// Cascade recalculate budgets from a starting month forward
export async function cascadeRecalculateFromMonth(
  categoryId: string,
  startYearMonth: string
): Promise<number> {
  const category = await db.query.categories.findFirst({
    where: eq(categories.id, categoryId),
  });
  
  if (!category) return 0;
  
  // If category has noRollover flag, skip cascade recalculation
  if (category.noRollover) {
    return 0;
  }
  
  let monthsUpdated = 0;
  let currentMonth = startYearMonth;
  
  // Keep recalculating while budgets exist
  while (true) {
    const existingBudget = await getBudgetForCategory(categoryId, currentMonth);
    if (!existingBudget) break;
    
    // Calculate this month's budget with rollover
    const rollover = await calculateRolloverAmount(categoryId, category.name, currentMonth);
    const newBudget = category.defaultBudget + rollover;
    
    // Update budget only if it changed
    if (existingBudget.monthlyLimit !== newBudget) {
      await updateBudgetLimit(categoryId, currentMonth, newBudget);
    }
    monthsUpdated++;
    
    // Move to next month
    currentMonth = getNextYearMonth(currentMonth);
    
    // Safety limit to prevent infinite loops
    if (monthsUpdated > 120) break; // Max 10 years
  }
  
  return monthsUpdated;
}
```

**Step 3: Run lint/typecheck**

Run: `npm run typecheck` (or similar)

Expected: No errors

**Step 4: Commit**

```bash
git add lib/budgets.ts
git commit -m "feat: respect noRollover flag in budget calculations"
```

---

### Task 4: Update Category Operations

**Files:**
- Modify: `lib/categories.ts`

**Step 1: Update createCategory to support noRollover parameter**

Find the createCategory function and add noRollover parameter:

```typescript
export async function createCategory(
  name: string, 
  color: string, 
  defaultBudget: number = 0,
  noRollover: boolean = false
): Promise<Category> {
  const id = generateCategoryId(name);
  const now = new Date();
  
  const [category] = await db
    .insert(categories)
    .values({
      id,
      name,
      color,
      defaultBudget,
      noRollover,
      isDefault: false,
    })
    .returning();
  
  return category;
}
```

**Step 2: Update updateCategory function**

Add noRollover to updateCategory:

```typescript
export async function updateCategory(
  id: string, 
  updates: {
    name?: string;
    color?: string;
    defaultBudget?: number;
    noRollover?: boolean;
  }
): Promise<Category | undefined> {
  const [category] = await db
    .update(categories)
    .set(updates)
    .where(eq(categories.id, id))
    .returning();
  
  return category;
}
```

**Step 3: Commit**

```bash
git add lib/categories.ts
git commit -m "feat: add noRollover support to category operations"
```

---

### Task 5: Update Budget Card Component

**Files:**
- Modify: `app/components/budgets/BudgetCard.tsx`

**Step 1: Add noRollover prop and visual indicator**

Add noRollover to the BudgetCard props:

```typescript
interface BudgetCardProps {
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  baseBudget: number;
  rolloverAmount: number;
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
  noRollover?: boolean;
}
```

**Step 2: Update the card display to show non-rollover status**

Add a badge or indicator when noRollover is true:

```typescript
{noRollover && (
  <Badge variant="secondary" className="text-xs">
    No Rollover
  </Badge>
)}
```

**Step 3: Commit**

```bash
git add app/components/budgets/BudgetCard.tsx
git commit -m "feat: show noRollover indicator on budget cards"
```

---

### Task 6: Update Budgets API

**Files:**
- Modify: `app/api/budgets/route.ts:23`

**Step 1: Include noRollover in budget data response**

Update the GET endpoint to include noRollover flag in the response. First, update `getBudgetsWithSpending` in `lib/budgets.ts` to include the flag.

Modify `getBudgetsWithSpending` function (lines 246-310):

Add noRollover to the result object:

```typescript
result.push({
  categoryId: cat.id,
  categoryName: cat.name,
  categoryColor: cat.color,
  monthlyLimit: budget.monthlyLimit,
  baseBudget,
  rolloverAmount,
  spent,
  remaining,
  overspent,
  savedAmount,
  noRollover: cat.noRollover || false,
});
```

**Step 2: Update BudgetWithSpending interface**

Add noRollover to the interface at line 5:

```typescript
export interface BudgetWithSpending {
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
```

**Step 3: Commit**

```bash
git add lib/budgets.ts app/api/budgets/route.ts
git commit -m "feat: include noRollover flag in budget API response"
```

---

### Task 7: Update Budgets Page

**Files:**
- Modify: `app/budgets/page.tsx:10-21`
- Modify: `app/budgets/page.tsx:171-186`

**Step 1: Add noRollover to BudgetData interface**

```typescript
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
```

**Step 2: Pass noRollover to BudgetCard component**

Update the BudgetCard usage (lines 171-186):

```typescript
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
```

**Step 3: Commit**

```bash
git add app/budgets/page.tsx
git commit -m "feat: pass noRollover flag through budget page"
```

---

### Task 8: Update Settings - Category Manager

**Files:**
- Modify: `app/components/settings/CategoryManager.tsx`

**Step 1: Add noRollover toggle in category form**

Find the category creation/editing form and add a checkbox for "No Rollover":

```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="noRollover"
    checked={noRollover}
    onCheckedChange={(checked) => setNoRollover(checked as boolean)}
  />
  <Label htmlFor="noRollover" className="text-sm font-normal">
    No Rollover (e.g., for Savings - budget doesn't accumulate)
  </Label>
</div>
```

**Step 2: Include noRollover in API calls**

Update the create/update API calls to include the noRollover value.

**Step 3: Show noRollover status in category list**

Add a badge or indicator in the category list to show which categories have noRollover enabled.

**Step 4: Commit**

```bash
git add app/components/settings/CategoryManager.tsx
git commit -m "feat: add noRollover toggle in category settings"
```

---

### Task 9: Update Categories API

**Files:**
- Modify: `app/api/categories/route.ts`

**Step 1: Handle noRollover in POST/PUT endpoints**

Update the create and update endpoints to accept and store the noRollover field.

**Step 2: Commit**

```bash
git add app/api/categories/route.ts
git commit -m "feat: support noRollover in categories API"
```

---

### Task 10: Testing

**Step 1: Manual Testing Checklist**

1. **Migration Test:**
   - Run migration script
   - Verify column added
   - Verify Savings category updated if exists

2. **Category Creation Test:**
   - Create new category with noRollover=true
   - Verify it's saved correctly
   - Check in database: `SELECT name, no_rollover FROM categories;`

3. **Budget Display Test:**
   - Navigate to budgets page
   - Verify noRollover indicator shows on budget cards
   - Verify rollover amount is 0 for noRollover categories

4. **Budget Calculation Test:**
   - Set a budget for a noRollover category in month 1
   - Spend less than budget in month 1
   - Check month 2 budget - should NOT include rollover from month 1
   - Verify regular categories still rollover correctly

5. **Settings Test:**
   - Toggle noRollover on/off in settings
   - Verify changes persist
   - Verify budget calculations update immediately

**Step 2: Update AGENTS.md Documentation**

Add a note about the Savings/non-rollover feature:

```markdown
## Budget Rollover Behavior

Categories can be configured with `noRollover=true` (e.g., "Savings"). 
These categories:
- Don't accumulate unused budget from previous months
- Show a "No Rollover" badge on budget cards
- Have their rollover amount always set to 0

To configure: Go to Settings → Categories → Edit Category → Check "No Rollover"
```

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add documentation for noRollover budget feature"
```

---

## Summary

This implementation adds a `noRollover` boolean flag to categories that prevents budget rollover accumulation. The feature is particularly useful for "Savings" categories where you don't want unspent budget to accumulate month-over-month.

**Key Changes:**
1. Database schema - Added `no_rollover` column
2. Migration script - Adds column and auto-configures Savings
3. Budget calculations - Respects the flag in rollover logic
4. API - Includes flag in responses
5. UI - Shows indicator and allows configuration

**Testing:**
- Verify Savings category gets noRollover=true after migration
- Create test budgets and confirm no rollover occurs
- Test regular categories still rollover correctly
