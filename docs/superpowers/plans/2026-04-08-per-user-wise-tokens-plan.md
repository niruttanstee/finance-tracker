# Per-User Wise Tokens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each user configures their own Wise API token in settings. Sync button shows Wise mode only if user has token, otherwise shows upload mode.

**Architecture:** Settings API filters by userId. `createWiseClient()` accepts optional token from DB. Sync route fetches user's token from their settings row.

**Tech Stack:** PostgreSQL + Drizzle ORM, existing Wise client

---

## File Map

```
lib/wise.ts                       Modify: createWiseClient() accepts optional token
app/api/settings/route.ts         Modify: filter and upsert by userId
app/api/sync/route.ts            Modify: fetch user's token from settings, return error if none
```

---

## Task 1: `createWiseClient()` Optional Token

**Files:**
- Modify: `lib/wise.ts:141-147`

- [ ] **Step 1: Update `createWiseClient()` function**

Change from:
```typescript
export function createWiseClient(): WiseClient {
  const token = process.env.WISE_API_TOKEN;
  if (!token) {
    throw new Error('WISE_API_TOKEN not configured');
  }
  return new WiseClient(token);
}
```

To:
```typescript
export function createWiseClient(token?: string): WiseClient | null {
  if (!token) return null;
  return new WiseClient(token);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/wise.ts
git commit -m "feat: make createWiseClient accept optional token, return null if none"
```

---

## Task 2: Settings API Per-User Filtering

**Files:**
- Modify: `app/api/settings/route.ts`

- [ ] **Step 1: Update GET handler**

Change the `where` clause from `eq(settings.id, 'app_settings')` to filter by userId AND id:
```typescript
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await db.query.settings.findFirst({
    where: and(eq(settings.id, 'app_settings'), eq(settings.userId, userId)),
  });
  return NextResponse.json({
    data: result || { id: 'app_settings', apiProvider: null, apiKey: null },
  });
}
```

- [ ] **Step 2: Update PATCH handler**

Change the upsert to include userId:
```typescript
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { apiProvider, apiKey } = await request.json();
  const now = new Date();

  await db
    .insert(settings)
    .values({ id: 'app_settings', apiProvider, apiKey, createdAt: now, updatedAt: now, userId })
    .onConflictDoUpdate({
      target: [settings.id, settings.userId], // composite target
      set: { apiProvider, apiKey, updatedAt: now },
    });

  return NextResponse.json({ success: true });
}
```

Note: `settings.id` and `settings.userId` together form a unique constraint (id is always 'app_settings', userId is unique per user).

- [ ] **Step 3: Add missing import**

Add `and` to the import from drizzle-orm:
```typescript
import { eq, and } from 'drizzle-orm';
```

- [ ] **Step 4: Commit**

```bash
git add app/api/settings/route.ts
git commit -m "feat: filter settings by userId for per-user wise tokens"
```

---

## Task 3: Sync Route Uses Per-User Token

**Files:**
- Modify: `app/api/sync/route.ts`

- [ ] **Step 1: Update POST handler**

Add imports for settings:
```typescript
import { settings } from '@/lib/schema';
```

Update the POST function. Extract userId from header, fetch user's settings, get their token:

Change the beginning of POST from:
```typescript
export async function POST() {
  try {
    const client = createWiseClient();
    // ... rest
```

To:
```typescript
export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch user's Wise token from their settings
    const userSettings = await db.query.settings.findFirst({
      where: and(eq(settings.id, 'app_settings'), eq(settings.userId, userId)),
    });

    if (!userSettings?.apiKey) {
      return NextResponse.json(
        { error: 'No Wise token configured. Use PDF upload instead.' },
        { status: 400 }
      );
    }

    const client = createWiseClient(userSettings.apiKey);
    if (!client) {
      return NextResponse.json(
        { error: 'No Wise token configured. Use PDF upload instead.' },
        { status: 400 }
      );
    }
    // ... rest of existing code
```

Also add `and` to the imports:
```typescript
import { eq, and } from 'drizzle-orm';
```

- [ ] **Step 2: Commit**

```bash
git add app/api/sync/route.ts
git commit -m "feat: sync route uses per-user wise token from settings"
```

---

## Self-Review Checklist

- [ ] `createWiseClient()` returns `null` if no token provided (not an exception)
- [ ] Settings GET filters by userId
- [ ] Settings PATCH upserts with userId
- [ ] Sync route fetches user's token and returns 400 if none
- [ ] No placeholder/TODO comments in implementation
