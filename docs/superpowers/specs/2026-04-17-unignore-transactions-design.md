# Design: Un-Ignore Transactions

**Date:** 2026-04-17
**Status:** Approved

---

## 1. Overview

Allow users to un-ignore transactions by selecting any category from the dropdown — keeping the category Select always visible even when a transaction is ignored.

---

## 2. Current Behavior

When a transaction has `ignored === true`, the category Select is hidden and replaced with an "Ignored" badge (EyeOff icon). There is no way to un-ignore a transaction through the UI.

---

## 3. Proposed Change

**File:** `components/transactions/TransactionTable.tsx`

Remove the conditional that hides the category Select when `transaction.ignored === true`.

### Behavior

| Action | Result |
|--------|--------|
| Select "Groceries" on ignored tx | Sets category, `ignored → false` |
| Select "Uncategorized" on ignored tx | Clears category, `ignored → false` |
| Select "Ignored" on normal tx | `ignored → true` (existing) |

### Implementation

- Always render the category Select (with "Ignored" as the last SelectItem)
- When `ignored === true`, the Select default value should be `"__ignored__"` so the dropdown opens to "Ignored"
- When user selects any category (including "Uncategorized"), call `onIgnoreTransaction(id, false)`
- "Ignored" badge rendering can be removed since the Select handles both states — OR kept as a visual indicator while keeping the Select visible

### Scope

- **1 file changed**: `components/transactions/TransactionTable.tsx`
- **No API changes** — `PATCH /api/transactions` already supports `{ id, ignored: boolean }`
- **No schema changes**

---

## 4. Summary of Changes

| File | Change |
|------|--------|
| `components/transactions/TransactionTable.tsx` | Always render category Select; un-ignore on any category selection |
