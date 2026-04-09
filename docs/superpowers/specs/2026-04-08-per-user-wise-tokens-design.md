# Per-User Wise Tokens Design

**Date:** 2026-04-08
**Status:** Approved

## Overview

Each user configures their own Wise API token in settings. The Sync button shows "Sync with Wise" only if the user has a token saved. Otherwise it shows "Upload Statement" as the fallback.

---

## Current State

- `settings` table has `userId` column but API uses global `id='app_settings'` filter
- `createWiseClient()` reads from `WISE_API_TOKEN` env var — not per-user
- Sync/import routes already extract `userId` from header

---

## Changes

### 1. Settings API (`app/api/settings/route.ts`)

**GET:**
- Filter by `userId` from header → return user's settings row
- If no row found → return `{ data: null }` (empty settings)

**PATCH:**
- Upsert with `userId` → each user gets their own settings row
- Primary key stays as `id='app_settings'` but `userId` makes it unique per user

### 2. `lib/wise.ts` — `createWiseClient()` change

```typescript
export function createWiseClient(token?: string): WiseClient | null {
  if (!token) return null;
  return new WiseClient(token);
}
```

- Accept optional `token` parameter
- Return `null` if no token (not an error — allows check before sync)

### 3. Sync route (`POST /api/sync`)

- Extract `userId` from header (already done)
- Fetch user's settings from DB using `userId`
- If no `apiKey` → return 400 with `{ error: 'No Wise token configured. Use PDF upload instead.' }`
- Call `createWiseClient(userToken)` → proceed with sync

### 4. Import route (`POST /api/import`)

- No Wise token needed — already works as fallback
- Already includes `userId` in transaction inserts

### 5. Dashboard page (`app/page.tsx`)

- Already fetches settings per-user (after data isolation changes)
- Sets button mode: `hasWiseToken = settingsData.data?.apiProvider === 'wise' && !!settingsData.data?.apiKey`
- No UI change needed

### 6. ApiSettings component

- Already saves per-user settings (after data isolation changes)
- No code changes needed

---

## Data Flow

1. User visits Settings → enters Wise API token → saves
2. Token stored in `settings` table with user's `userId`
3. User visits Dashboard → fetches their own settings
4. If `apiProvider === 'wise' && apiKey` → shows "Sync with Wise"
5. If no token → shows "Upload Statement"
6. Sync call uses user's own token from DB
