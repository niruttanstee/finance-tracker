# Skip Identical Transaction Records on Re-import

## Status
Approved

## Problem
When re-importing a PDF bank statement or syncing from Wise, if a transaction with the same composite ID exists and all relevant fields are identical, the system still performs an UPDATE — touching `updatedAt` and risking user-modified fields like `category`.

## Solution
Before insert/update, compare all transaction fields **except `category`** between the incoming record and the existing DB record. If identical, skip the write entirely.

## Fields to Compare
- `date`, `description`, `merchant`, `amount`, `currency`
- `originalAmount`, `originalCurrency`, `exchangeRate`, `type`

## Fields Excluded from Comparison
- `category` — user-set, must never be overwritten on re-import
- `updatedAt` — always changes on write, would never match

## Affected Files
1. `app/api/import/route.ts` — PDF bank statement import
2. `app/api/sync/route.ts` — Wise API sync

## Implementation

### Import Route (`app/api/import/route.ts`)
In the transaction loop (lines ~51-95), after checking for existing record but before the insert/update branch:

1. If no existing record → INSERT (existing behavior)
2. If existing record found:
   - **Compare fields:** `date`, `description`, `merchant`, `amount`, `currency`, `originalAmount`, `originalCurrency`, `exchangeRate`, `type`
   - If ALL compared fields are identical to existing record → **SKIP** (no DB write)
   - If any field differs → UPDATE (existing behavior, preserving `category`)

### Sync Route (`app/api/sync/route.ts`)
In the transaction loop (lines ~237-268), same pattern:

1. If no existing record → INSERT (existing behavior)
2. If existing record found:
   - **Compare fields:** same as above
   - If ALL compared fields are identical → **SKIP** (no DB write)
   - If any field differs → UPDATE (existing behavior, preserving `category`)

### Response Changes
Add `skipped` counter to API response:
```json
{ "success": true, "inserted": 0, "updated": 0, "skipped": 5, "total": 10 }
```

## Comparison Helper
Create a shared helper function `isTransactionIdentical(existing, incoming)` that returns `true` if all compared fields match.

```typescript
function isTransactionIdentical(
  existing: Transaction,
  incoming: { date: Date; description: string; merchant: string; amount: number; currency: string; originalAmount: number | null; originalCurrency: string | null; exchangeRate: number | null; type: 'DEBIT' | 'CREDIT' }
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

## Rationale
- Category must never be overwritten because users manually categorize transactions
- Skipping unnecessary writes reduces DB load and avoids `updatedAt` churn
- The composite ID already handles deduplication; this adds a finer-grained "no-change" check
