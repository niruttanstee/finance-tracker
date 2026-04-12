# Fix Category Spending Trend Graph

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Fix the Category Spending Trend graph on the homepage that's not displaying data due to date type mismatch in SQL queries.

**Architecture:** The issue is in `lib/dashboard.ts` where JavaScript Date objects are being compared against SQLite Unix timestamp integers. Need to convert all Date objects to Unix timestamps (seconds since epoch) before using in SQL queries.

**Tech Stack:** Next.js 14, TypeScript, Drizzle ORM, SQLite

---

## Investigation Summary

**Root Cause:** 
- Database schema stores `transactions.date` as Unix timestamp (integer, seconds since epoch)
- Queries in `lib/dashboard.ts` use JavaScript Date objects for comparison
- This causes the SQL queries to return no results, resulting in empty graph data

**Problematic Code Locations:**
- `lib/dashboard.ts:32-36` - Trend query uses `trendStart` (Date object)
- `lib/dashboard.ts:91-94` - Income query uses `monthStart`/`monthEnd` (Date objects)  
- `lib/dashboard.ts:109-112` - Category breakdown query uses `monthStart`/`monthEnd` (Date objects)

---

## Task 1: Fix Date Type Mismatch in Dashboard Queries

**Files:**
- Modify: `lib/dashboard.ts:15-131`

**Step 1: Convert Date objects to Unix timestamps**

Replace the date variable declarations at lines 16-21:

```typescript
// BEFORE (lines 16-21):
  const monthDate = new Date(monthStr + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  
  // Get 6-month trend ending at selected month
  const trendStart = startOfMonth(subMonths(monthDate, 5));

// AFTER:
  const monthDate = new Date(monthStr + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  
  // Get 6-month trend ending at selected month
  const trendStart = startOfMonth(subMonths(monthDate, 5));
  
  // Convert to Unix timestamps (seconds) for SQL queries
  const monthStartUnix = Math.floor(monthStart.getTime() / 1000);
  const monthEndUnix = Math.floor(monthEnd.getTime() / 1000);
  const trendStartUnix = Math.floor(trendStart.getTime() / 1000);
```

**Step 2: Fix the trend query (lines 31-36)**

```typescript
// BEFORE (lines 31-36):
    .where(
      and(
        gte(transactions.date, trendStart),
        eq(transactions.type, 'DEBIT')
      )
    )

// AFTER:
    .where(
      and(
        gte(transactions.date, trendStartUnix),
        lte(transactions.date, monthEndUnix),
        eq(transactions.type, 'DEBIT')
      )
    )
```

**Step 3: Fix the income query (lines 90-95)**

```typescript
// BEFORE (lines 90-95):
    .where(
      and(
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
        eq(transactions.type, 'CREDIT')
      )
    );

// AFTER:
    .where(
      and(
        gte(transactions.date, monthStartUnix),
        lte(transactions.date, monthEndUnix),
        eq(transactions.type, 'CREDIT')
      )
    );
```

**Step 4: Fix the category breakdown query (lines 108-113)**

```typescript
// BEFORE (lines 108-113):
    .where(
      and(
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
        eq(transactions.type, 'DEBIT')
      )
    )

// AFTER:
    .where(
      and(
        gte(transactions.date, monthStartUnix),
        lte(transactions.date, monthEndUnix),
        eq(transactions.type, 'DEBIT')
      )
    )
```

**Step 5: Verify the fixes**

Run the dev server and check the homepage:
```bash
npm run dev
```

**Expected Result:** 
- Category Spending Trend graph should display data
- Lines for each category should be visible
- "Total" line should show in bold black
- No console errors

---

## Task 2: Test Other Dashboard Components

**Files:**
- Test via browser: `http://localhost:3000`

**Step 1: Verify all dashboard components work**

Check these elements on the homepage:
- [ ] Month navigation (prev/next buttons)
- [ ] Available Funds card displays correct balance
- [ ] Monthly Spending card displays correct amount  
- [ ] Savings card displays correct calculation
- [ ] Uncategorized count is accurate
- [ ] Spending by Category pie chart works
- [ ] Category Spending Trend line chart works

**Step 2: Test different months**

Use the month navigation to check:
- [ ] Previous month data loads correctly
- [ ] Next month data loads correctly
- [ ] Category trend updates for each month

---

## Task 3: Run Lint and Type Check

**Files:**
- Command: `npm run lint` and `npm run typecheck`

**Step 1: Run lint**
```bash
npm run lint
```
**Expected:** No errors

**Step 2: Run type check**
```bash
npm run typecheck
```
**Expected:** No TypeScript errors

---

## Summary of Changes

**Modified File:** `lib/dashboard.ts`

**Key Changes:**
1. Added Unix timestamp conversions for all date comparisons
2. Fixed trend query to use `trendStartUnix` and `monthEndUnix`
3. Fixed income query to use `monthStartUnix` and `monthEndUnix`
4. Fixed category breakdown query to use `monthStartUnix` and `monthEndUnix`
5. Added missing upper bound (`lte`) to trend query to limit to 6-month window

**Root Cause:** SQLite stores dates as Unix timestamps (integers), but the code was comparing them with JavaScript Date objects. Drizzle ORM doesn't automatically convert Date objects to Unix timestamps for SQLite integer fields.

**Solution:** Convert all Date objects to Unix timestamps using `Math.floor(date.getTime() / 1000)` before using in SQL queries.