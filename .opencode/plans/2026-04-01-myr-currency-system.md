# MYR-Only Currency System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Convert entire finance tracker to use MYR as the primary currency, storing original currency data for reference, and display everything in RM format.

**Architecture:** Update database schema to store MYR as primary amount while preserving original currency data. Modify sync process to convert non-MYR transactions using Wise exchange rates. Update all UI components to display RM instead of USD. Add current MYR balance display to dashboard.

**Tech Stack:** Next.js 14, TypeScript, SQLite, Drizzle ORM, Wise API

---

## Prerequisites

Before starting, ensure:
- `WISE_API_TOKEN` environment variable is set
- You can run `npm run dev` successfully
- Database is at `data/finance.db`

---

## Task 1: Update Database Schema

**Files:**
- Modify: `lib/schema.ts:1-27`

**Step 1: Add new columns to transactions table**

```typescript
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  profileId: integer('profile_id').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  merchant: text('merchant').notNull(),
  amount: real('amount').notNull(), // Now always in MYR
  currency: text('currency', { length: 3 }).notNull().default('MYR'), // Always MYR
  originalAmount: real('original_amount'), // Amount in source currency
  originalCurrency: text('original_currency', { length: 3 }), // Source currency code
  exchangeRate: real('exchange_rate'), // Rate used for conversion
  type: text('type', { enum: ['DEBIT', 'CREDIT'] }).notNull(),
  category: text('category'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
```

**Step 2: Run database migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

Expected: Migration creates new columns successfully

**Step 3: Commit**

```bash
git add lib/schema.ts
git commit -m "feat: add original currency columns for MYR conversion"
```

---

## Task 2: Add Exchange Rate Function to Wise Client

**Files:**
- Modify: `lib/wise.ts:1-122`

**Step 1: Add getExchangeRate method to WiseClient class**

Add after line 71 (after getBalances method):

```typescript
async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) {
    return 1;
  }
  
  const response = await this.fetch<{
    rate: number;
  }>(`/v1/rates?source=${fromCurrency}&target=${toCurrency}`);
  
  return response.rate;
}
```

**Step 2: Verify the method compiles**

```bash
npx tsc --noEmit lib/wise.ts
```

Expected: No TypeScript errors

**Step 3: Commit**

```bash
git add lib/wise.ts
git commit -m "feat: add exchange rate fetching to Wise client"
```

---

## Task 3: Update Sync Process to Convert to MYR

**Files:**
- Modify: `app/api/sync/route.ts:1-203`

**Step 1: Update imports and add conversion function**

Add import at top (line 5):
```typescript
import { createWiseClient } from '@/lib/wise';
```

Add conversion function after generateCompositeId (around line 12):

```typescript
async function convertToMYR(
  client: ReturnType<typeof createWiseClient>,
  amount: number,
  fromCurrency: string
): Promise<{ myrAmount: number; rate: number }> {
  if (fromCurrency === 'MYR') {
    return { myrAmount: amount, rate: 1 };
  }
  
  const rate = await client.getExchangeRate(fromCurrency, 'MYR');
  return { myrAmount: amount * rate, rate };
}
```

**Step 2: Update parseStatementTransaction to include currency conversion**

Modify the function signature to accept client and make it async (line 22):

```typescript
async function parseStatementTransaction(
  client: ReturnType<typeof createWiseClient>,
  transaction: {
    transactionId: string;
    type: string;
    date: string;
    description: string | null | undefined;
    amount: number;
    currency: string;
    merchant?: string | null;
  },
  profileId: number
): Promise<{
  id: string;
  wiseId: string;
  profileId: number;
  date: Date;
  description: string;
  merchant: string;
  amount: number; // MYR
  currency: string; // Always MYR
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
  createdAt: Date;
  updatedAt: Date;
}> {
  const isDebit = transaction.amount < 0;
  const typeLabel = transaction.type
    ?.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Transaction';
  const description = transaction.description || typeLabel;
  const merchant = transaction.merchant || extractMerchant(description, typeLabel);
  const date = new Date(transaction.date);
  const absAmount = Math.abs(transaction.amount);
  const sourceCurrency = transaction.currency;
  
  // Convert to MYR
  const { myrAmount, rate } = await convertToMYR(client, absAmount, sourceCurrency);
  
  // Generate composite ID using MYR amount (always MYR now)
  const compositeId = generateCompositeId(date, merchant, myrAmount, 'MYR');
  
  return {
    id: compositeId,
    wiseId: transaction.transactionId,
    profileId: profileId,
    date: date,
    description: description,
    merchant: merchant,
    amount: myrAmount,
    currency: 'MYR',
    originalAmount: sourceCurrency === 'MYR' ? null : absAmount,
    originalCurrency: sourceCurrency === 'MYR' ? null : sourceCurrency,
    exchangeRate: sourceCurrency === 'MYR' ? null : rate,
    type: isDebit ? 'DEBIT' : 'CREDIT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

**Step 3: Update sync endpoint to use new parse function**

Around line 130, change:
```typescript
const parsed = statementTransactions.map(t => 
  parseStatementTransaction(t, personalProfile.id)
);
```

To:
```typescript
const parsed = await Promise.all(
  statementTransactions.map(t => 
    parseStatementTransaction(client, t, personalProfile.id)
  )
);
```

**Step 4: Update the allTransactions type definition**

Around line 116, update the type to include new fields:

```typescript
let allTransactions: Array<{
  id: string;
  wiseId: string;
  profileId: number;
  date: Date;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
  createdAt: Date;
  updatedAt: Date;
}> = [];
```

**Step 5: Test the sync endpoint**

```bash
curl -X POST http://localhost:3000/api/sync
```

Expected: Returns success with converted amounts

**Step 6: Commit**

```bash
git add app/api/sync/route.ts
git commit -m "feat: convert all transactions to MYR during sync"
```

---

## Task 4: Create Script to Drop and Re-fetch Database

**Files:**
- Create: `scripts/reset-and-sync.ts`

**Step 1: Create reset script**

```typescript
import { db } from '../lib/db';
import { transactions, categories } from '../lib/schema';

async function resetDatabase() {
  console.log('Dropping all transactions...');
  await db.delete(transactions);
  
  console.log('Dropping all categories...');
  await db.delete(categories);
  
  console.log('Database reset complete. Run sync to re-fetch.');
  process.exit(0);
}

resetDatabase().catch(console.error);
```

**Step 2: Add to package.json scripts**

Add to `package.json` scripts section:
```json
"db:reset": "npx tsx scripts/reset-and-sync.ts"
```

**Step 3: Test the reset script**

```bash
npm run db:reset
```

Expected: "Database reset complete" message

**Step 4: Commit**

```bash
git add scripts/reset-and-sync.ts package.json
git commit -m "feat: add database reset script"
```

---

## Task 5: Update Dashboard Page - Currency Display

**Files:**
- Modify: `app/page.tsx:76`

**Step 1: Change USD to RM in Current Month Spending card**

Change line 76 from:
```tsx
${currentMonthTotal.toFixed(2)}
```

To:
```tsx
RM {currentMonthTotal.toFixed(2)}
```

**Step 2: Test the dashboard**

```bash
npm run dev
```

Visit: http://localhost:3000
Expected: Shows "RM 123.45" instead of "$123.45"

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: display currency in RM format on dashboard"
```

---

## Task 6: Update Monthly Spending Chart

**Files:**
- Modify: `app/components/charts/MonthlySpending.tsx:35,38`

**Step 1: Update Y-axis formatter**

Change line 35 from:
```typescript
tickFormatter={(value) => `$${Number(value).toFixed(0)}`}
```

To:
```typescript
tickFormatter={(value) => `RM ${Number(value).toFixed(0)}`}
```

**Step 2: Update tooltip formatter**

Change line 38 from:
```typescript
formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']}
```

To:
```typescript
formatter={(value) => [`RM ${Number(value).toFixed(2)}`, 'Spent']}
```

**Step 3: Test the chart**

Refresh dashboard and check Monthly Spending chart
Expected: Y-axis and tooltips show "RM 123" format

**Step 4: Commit**

```bash
git add app/components/charts/MonthlySpending.tsx
git commit -m "feat: display RM in monthly spending chart"
```

---

## Task 7: Update Category Breakdown Chart

**Files:**
- Modify: `app/components/charts/CategoryBreakdown.tsx:46`

**Step 1: Update tooltip formatter**

Change line 46 from:
```typescript
return [`$${numValue.toFixed(2)} (${percent.toFixed(1)}%)`, name];
```

To:
```typescript
return [`RM ${numValue.toFixed(2)} (${percent.toFixed(1)}%)`, name];
```

**Step 2: Test the chart**

Refresh dashboard and check Spending by Category chart
Expected: Tooltips show "RM 123.45 (50.0%)" format

**Step 3: Commit**

```bash
git add app/components/charts/CategoryBreakdown.tsx
git commit -m "feat: display RM in category breakdown chart"
```

---

## Task 8: Add Current Balance API Endpoint

**Files:**
- Create: `app/api/balance/route.ts`

**Step 1: Create balance endpoint**

```typescript
import { NextResponse } from 'next/server';
import { createWiseClient } from '@/lib/wise';

export async function GET() {
  try {
    const client = createWiseClient();
    
    // Get personal profile
    const profiles = await client.getProfiles();
    let personalProfile = profiles.find(p => p.type?.toLowerCase() === 'personal');
    
    if (!personalProfile && profiles.length > 0) {
      personalProfile = profiles[0];
    }
    
    if (!personalProfile) {
      return NextResponse.json(
        { error: 'No profile found' },
        { status: 404 }
      );
    }

    // Get balances - filter for MYR only
    const balances = await client.getBalances(personalProfile.id);
    const myrBalance = balances.find(b => b.currency === 'MYR');
    
    if (!myrBalance) {
      return NextResponse.json({
        balance: 0,
        currency: 'MYR',
        message: 'No MYR balance found'
      });
    }

    return NextResponse.json({
      balance: myrBalance.amount,
      currency: 'MYR',
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
```

**Step 2: Test the endpoint**

```bash
curl http://localhost:3000/api/balance
```

Expected: Returns `{ "balance": 1234.56, "currency": "MYR" }`

**Step 3: Commit**

```bash
git add app/api/balance/route.ts
git commit -m "feat: add MYR balance API endpoint"
```

---

## Task 9: Add Current Balance to Dashboard

**Files:**
- Modify: `app/page.tsx:1-138`
- Create: `lib/balance.ts`

**Step 1: Create balance library function**

Create `lib/balance.ts`:
```typescript
export async function getCurrentBalance(): Promise<{ balance: number; currency: string }> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/balance`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch balance');
  }
  
  return response.json();
}
```

**Step 2: Update DashboardPage to fetch balance**

Add import at top:
```typescript
import { getCurrentBalance } from '@/lib/balance';
```

Add to the Promise.all array (around line 24):
```typescript
const [
  monthlySpending,
  categoryBreakdown,
  uncategorizedCount,
  currentMonthTransactions,
  lastMonthTransactions,
  currentBalance,
] = await Promise.all([
  getMonthlySpending(6),
  getCategoryBreakdown(currentMonthStart, currentMonthEnd),
  getUncategorizedCount(),
  getTransactions({
    startDate: currentMonthStart,
    endDate: currentMonthEnd,
    type: 'DEBIT',
  }),
  getTransactions({
    startDate: lastMonthStart,
    endDate: lastMonthEnd,
    type: 'DEBIT',
  }),
  getCurrentBalance(),
]);
```

**Step 3: Add Current Balance card**

Add new Card component in the Key Metrics section (after the Quick Actions card, around line 100):

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">
      Current Balance
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      RM {currentBalance.balance.toFixed(2)}
    </div>
    <p className="text-xs text-muted-foreground">
      Wise MYR account
    </p>
  </CardContent>
</Card>
```

**Step 4: Update grid layout**

Change the grid class from `md:grid-cols-3` to `md:grid-cols-4` (line 67):

```tsx
<div className="grid gap-4 md:grid-cols-4 mb-8">
```

**Step 5: Test the dashboard**

```bash
npm run dev
```

Visit: http://localhost:3000
Expected: Shows 4 cards including "Current Balance" with RM amount

**Step 6: Commit**

```bash
git add lib/balance.ts app/page.tsx
git commit -m "feat: add current balance card to dashboard"
```

---

## Task 10: Update Transaction List Display

**Files:**
- Modify: `app/components/transactions/TransactionList.tsx:88-89`

**Step 1: Update amount display to show RM**

Change lines 88-89 from:
```tsx
{transaction.type === 'CREDIT' ? '+' : '-'}
{transaction.currency} {transaction.amount.toFixed(2)}
```

To:
```tsx
{transaction.type === 'CREDIT' ? '+' : '-'}RM {transaction.amount.toFixed(2)}
```

**Step 2: Add original currency tooltip**

Enhance the TableCell to show original currency on hover:

```tsx
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
```

**Step 3: Test the transaction list**

Visit: http://localhost:3000/transactions
Expected: Shows "RM 123.45" with tooltip showing original currency

**Step 4: Commit**

```bash
git add app/components/transactions/TransactionList.tsx
git commit -m "feat: display RM in transaction list with original currency tooltip"
```

---

## Task 11: Final Database Reset and Sync

**Step 1: Stop the dev server**

```bash
# Press Ctrl+C in the terminal running npm run dev
```

**Step 2: Reset the database**

```bash
npm run db:reset
```

Expected: "Database reset complete"

**Step 3: Re-fetch all transactions**

```bash
curl -X POST http://localhost:3000/api/sync
```

Expected: Returns success with converted MYR amounts

**Step 4: Start dev server and verify**

```bash
npm run dev
```

Visit: http://localhost:3000

Verify:
- [ ] Current Month Spending shows "RM X.XX"
- [ ] Current Balance shows "RM X.XX" (MYR account only)
- [ ] Monthly Spending chart shows RM axis
- [ ] Category Breakdown shows RM tooltips
- [ ] All transactions show RM amounts
- [ ] Tooltips show original currency conversions

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete MYR currency conversion system"
```

---

## Verification Checklist

- [ ] Database schema has new columns (originalAmount, originalCurrency, exchangeRate)
- [ ] Sync converts all non-MYR to MYR using Wise rates
- [ ] Composite IDs use MYR amounts
- [ ] Dashboard shows RM format everywhere
- [ ] Current Balance card displays MYR balance
- [ ] Transaction list shows RM with original currency tooltip
- [ ] Charts display RM format
- [ ] Database was reset and re-synced with MYR data

---

## Notes

- All amounts are now stored as MYR in the database
- Original currency info preserved for reference
- Future non-MYR transactions will be converted during sync
- Exchange rates are fetched at sync time ( Wise API)
- Current Balance shows only MYR accounts from Wise
