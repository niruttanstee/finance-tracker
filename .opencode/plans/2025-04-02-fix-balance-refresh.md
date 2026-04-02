# Fix Balance Updates and Auto-Refresh After Sync - Implementation Plan

## Goal
Fix the dashboard balance not updating issue and implement automatic page refresh after Wise sync completes successfully.

**Architecture:** The homepage is a Server Component that fetches data at render time with Next.js caching. To fix the balance update issue, we need to disable caching on the dashboard page and trigger a re-render after successful sync.

**Tech Stack:** Next.js 14 App Router, React, TypeScript

---

## Diagnosis

**Problem 1: Balance Not Updating**
- Homepage (`page.tsx`) is a Server Component with default caching
- Next.js App Router aggressively caches data by default
- Balance fetched via `getCurrentBalance()` in `lib/balance.ts` is cached
- User sees stale balance until manual page refresh

**Problem 2: No Auto-refresh After Sync**
- `SyncButton` component syncs transactions successfully
- No mechanism to re-fetch balance or refresh server components
- Page remains stale after sync completes
- User must manually refresh browser

## Implementation Tasks

### Task 1: Add Dynamic Export to Disable Caching on Homepage

**Files:**
- Modify: `app/page.tsx` (add export to disable caching)

**Step 1: Add dynamic export at top of file**

Add this line at the top of `app/page.tsx` (after imports, before component):

```typescript
export const dynamic = 'force-dynamic';
```

This tells Next.js to render the page on every request instead of using the cache.

**Step 2: Verify the export placement**

The file should look like:
```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SyncButton } from './components/SyncButton';
import { MonthlySpending } from './components/charts/MonthlySpending';
import { CategoryBreakdown } from './components/charts/CategoryBreakdown';
import { getMonthlySpending, getCategoryBreakdown, getUncategorizedCount, getTransactions } from '@/lib/transactions';
import { getCurrentBalance } from '@/lib/balance';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // ... rest of component
}
```

### Task 2: Implement Auto-Refresh After Sync

**Files:**
- Modify: `app/components/SyncButton.tsx`

**Step 1: Import useRouter from next/navigation**

Add import:
```typescript
import { useRouter } from 'next/navigation';
```

**Step 2: Add router and call refresh() after successful sync**

Update the component:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SyncResult {
  success: boolean;
  inserted?: number;
  updated?: number;
  error?: string;
}

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          inserted: data.inserted,
          updated: data.updated,
        });
        setLastSync(new Date());
        // Refresh the page to update balance and other data
        router.refresh();
      } else {
        setResult({
          success: false,
          error: data.error || 'Sync failed',
        });
      }
    } catch {
      setResult({
        success: false,
        error: 'Network error. Please try again.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        className="w-full"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
        />
        {isSyncing ? 'Syncing...' : 'Sync with Wise'}
      </Button>

      {lastSync && (
        <p className="text-sm text-muted-foreground text-center">
          Last synced: {lastSync.toLocaleString()}
        </p>
      )}

      {result && (
        <div
          className={`text-sm text-center p-2 rounded ${
            result.success
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {result.success ? (
            <>
              ✅ Synced successfully!
              {result.inserted ? ` ${result.inserted} new` : ''}
              {result.updated ? ` ${result.updated} updated` : ''}
            </>
          ) : (
            <>❌ {result.error}</>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Test the implementation**

1. Run the dev server: `npm run dev`
2. Navigate to the homepage
3. Note the current balance displayed
4. Click "Sync with Wise"
5. Wait for sync to complete successfully
6. Verify that the page automatically refreshes and shows updated data
7. Check that the balance reflects the latest value from Wise

## Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `app/page.tsx` | Add `export const dynamic = 'force-dynamic'` | Disable caching to always fetch fresh balance |
| `app/components/SyncButton.tsx` | Import `useRouter` and call `router.refresh()` after sync | Trigger re-render of server components |

## Testing Checklist

- [ ] Homepage loads without errors
- [ ] Balance displays correctly on initial load
- [ ] Clicking "Sync with Wise" triggers sync
- [ ] After sync completes, page automatically refreshes
- [ ] Updated balance is displayed after refresh
- [ ] Transaction counts update correctly
- [ ] Charts refresh with latest data
- [ ] Error states still display correctly