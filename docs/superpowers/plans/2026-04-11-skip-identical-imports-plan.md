# Skip Identical Transaction Records on Re-import

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When re-importing a PDF or syncing from Wise, if a transaction is byte-for-byte identical (except `category`), skip the DB write entirely.

**Architecture:** Add a shared `isTransactionIdentical()` helper in `lib/transactions.ts`, then use it in both `app/api/import/route.ts` and `app/api/sync/route.ts` to gate inserts/updates behind an identity check. Both routes gain a `skipped` counter in their response.

**Tech Stack:** TypeScript, Drizzle ORM, Next.js App Router

---

## File Map

| File | Change |
|------|--------|
| `lib/transactions.ts` | Add `isTransactionIdentical()` helper |
| `app/api/import/route.ts` | Use helper in transaction loop, add `skipped` counter |
| `app/api/sync/route.ts` | Use helper in transaction loop, add `skipped` counter |

---

## Task 1: Add `isTransactionIdentical` helper to `lib/transactions.ts`

**Files:**
- Modify: `lib/transactions.ts:159` (append after `generateCompositeId`)

- [ ] **Step 1: Add the helper function after `generateCompositeId`**

Append this to `lib/transactions.ts`:

```typescript
export interface IncomingTransactionFields {
  date: Date;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
}

/**
 * Returns true if all transaction fields (except category and updatedAt)
 * are identical between the existing DB record and the incoming fields.
 * Category is excluded because users manually set it.
 */
export function isTransactionIdentical(
  existing: Transaction,
  incoming: IncomingTransactionFields
): boolean {
  return (
    existing.date.getTime() === incoming.date.getTime() &&
    existing.description === incoming.description &&
    existing.merchant === incoming.merchant &&
    existing.amount === incoming.amount &&
    existing.currency === incoming.currency &&
    existing.originalAmount === incoming.originalAmount &&
    existing.originalCurrency === incoming.originalCurrency &&
    existing.exchangeRate === incoming.exchangeRate &&
    existing.type === incoming.type
  );
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit lib/transactions.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add lib/transactions.ts
git commit -m "feat: add isTransactionIdentical helper for import/sync deduplication"
```

---

## Task 2: Add skipped counter to `app/api/import/route.ts`

**Files:**
- Modify: `app/api/import/route.ts:48-103`

- [ ] **Step 1: Add `skipped` counter and import the helper**

After line 48 (`let inserted = 0;`), add `let skipped = 0;`

Update the import at the top of the file from:
```typescript
import { generateCompositeId } from '@/lib/transactions';
```
to:
```typescript
import { generateCompositeId, isTransactionIdentical } from '@/lib/transactions';
```

- [ ] **Step 2: Modify the transaction loop to use the helper**

Replace the existing loop body (lines 58-74, the `if (existing)` branch) with:

```typescript
      if (existing) {
        // Build the incoming fields object for comparison
        const incomingFields = {
          date: tx.date,
          description: tx.description,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          originalAmount: tx.originalAmount,
          originalCurrency: tx.originalCurrency,
          exchangeRate: tx.exchangeRate,
          type: tx.type,
        };

        if (isTransactionIdentical(existing, incomingFields)) {
          // Record is identical — skip the write to preserve user-modified category
          skipped++;
        } else {
          await db
            .update(transactions)
            .set({
              description: tx.description,
              merchant: tx.merchant,
              amount: tx.amount,
              currency: tx.currency,
              originalAmount: tx.originalAmount,
              originalCurrency: tx.originalCurrency,
              exchangeRate: tx.exchangeRate,
              type: tx.type,
              category: tx.type === 'CREDIT' ? 'Income' : existing.category,
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, compositeId));
          updated++;
        }
```

- [ ] **Step 3: Update the response to include `skipped`**

Replace the return block (lines 97-103) with:

```typescript
    return NextResponse.json({
      success: true,
      bank: parsed.bank,
      inserted,
      updated,
      skipped,
      total: parsed.transactions.length,
    });
```

- [ ] **Step 4: Verify the file compiles**

Run: `npx tsc --noEmit app/api/import/route.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/import/route.ts
git commit -m "feat(import): skip identical transaction records to preserve category"
```

---

## Task 3: Add skipped counter to `app/api/sync/route.ts`

**Files:**
- Modify: `app/api/sync/route.ts:234-276`

- [ ] **Step 1: Add `skipped` counter and import the helper**

After line 235 (`let updated = 0;`), add `let skipped = 0;`

Update the import at the top of the file from:
```typescript
import { generateCompositeId } from '@/lib/transactions';
```
to:
```typescript
import { generateCompositeId, isTransactionIdentical } from '@/lib/transactions';
```

- [ ] **Step 2: Modify the transaction loop to use the helper**

Replace the `if (existing)` branch (lines 249-258) with:

```typescript
      if (existing) {
        if (isTransactionIdentical(existing, transaction)) {
          // Record is identical — skip the write to preserve user-modified category
          skipped++;
        } else {
          await db.update(transactions)
            .set({
              ...transaction,
              profileId: existing.profileId,
              category: existing.category, // Preserve existing category
              updatedAt: new Date(),
            })
            .where(and(eq(transactions.id, transaction.id), eq(transactions.userId, userId)));
          updated++;
        }
```

- [ ] **Step 3: Update the response to include `skipped`**

Replace the return block (lines 270-276) with:

```typescript
    return NextResponse.json({
      success: true,
      inserted,
      updated,
      skipped,
      total: allTransactions.length,
      unique: deduplicatedTransactions.length,
    });
```

- [ ] **Step 4: Verify the file compiles**

Run: `npx tsc --noEmit app/api/sync/route.ts`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add app/api/sync/route.ts
git commit -m "feat(sync): skip identical transaction records to preserve category"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| Shared helper `isTransactionIdentical` | Task 1 |
| Apply to `/api/import` route | Task 2 |
| Apply to `/api/sync` route | Task 3 |
| Skip writes when identical | Tasks 2, 3 |
| Preserve `category` on update | Tasks 2, 3 |
| Add `skipped` to API response | Tasks 2, 3 |
| Compare all fields except `category` | Task 1 |

No gaps found.
