# Finance Tracker

## Quick Start

**Working on a feature?**
1. `superpowers:brainstorming` — Explore requirements
2. `superpowers:writing-plans` — Create implementation plan
3. `superpowers:subagent-driven-development` — Execute with reviews

**Bug fix?**
1. `superpowers:systematic-debugging` — Root cause tracing
2. `superpowers:test-driven-development` — Write failing test first

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router), React 18 |
| Language | TypeScript 5 |
| Database | PostgreSQL + Drizzle ORM |
| UI | Tailwind CSS + shadcn/ui |
| Charts | Recharts |
| External API | Wise API (transaction syncing) |

## Core Principles

1. **Transaction IDs**: Use composite ID format `{unix_timestamp}_{merchant}_{amount}_{currency}` — NOT Wise's `transactionId` (inconsistent across balance accounts)
2. **Server Components**: Default, `"use client"` only when needed
3. **Type Safety**: No `any`, use `unknown`
4. **Tailwind Only**: No inline styles
5. **Drizzle**: Parameterized queries, no raw SQL
6. **Avoid useEffect**: Only use `useEffect` when truly necessary — prefer reactive state, derived data from props, or server-side fetching. See [React docs](https://react.dev/learn/you-might-not-need-an-effect) for guidance. Common cases that DON'T need useEffect: transforming data, controlling child components, syncing state from props.

## Testing & TDD

### TDD Protocol (Mandatory)
1. **Scaffold**: Create function/class stub with `throw new Error('NotImplemented')`
2. **Fail**: Write failing test FIRST — verify it fails before implementing
3. **Pass**: Write minimal code to pass the test
4. **Refactor**: Clean up while keeping tests green

**Rule**: Always run `npm test` BEFORE reporting a fix complete — never claim tests pass without executing them.

### Coverage Requirements
- **New code**: Minimum 80% coverage
- **Critical paths**: 100% coverage (calculations, financial data, auth)

## Key Files

| File | Purpose |
|------|---------|
| `app/api/sync/route.ts` | Wise sync endpoint |
| `app/api/transactions/route.ts` | Transaction API (GET/PATCH) |
| `app/transactions/page.tsx` | Transaction list UI |
| `lib/schema.ts` | Database schema definitions |
| `lib/transactions.ts` | Transaction DB operations |
| `lib/wise.ts` | Wise API client |

## Development Commands

```bash
npm run dev          # Start dev server
npm run db:init      # Initialize database with seed data
npm run db:reset     # Reset DB and re-sync from Wise
npm run lint         # ESLint
npm run test:coverage  # Coverage report (requires vitest --coverage)
npx tsx scripts/cleanup-duplicates.ts  # Fix duplicate transactions
```

## Scripts & ESM/CommonJS

The project uses CommonJS (`"type": "commonjs"` implied). Scripts run via `tsx` default to CJS output.

**If a script uses top-level `await`:**
- Rename it to `.mts` extension (e.g., `scripts/foo.ts` → `scripts/foo.mts`)
- Or use `npx tsx --loader ts=esm scripts/foo.ts`

**Common error:**
```
Top-level await is currently not supported with the "cjs" output format
```
This means you're running a script with top-level `await` as CommonJS. Fix by renaming to `.mts`.

## Database Schema

See `lib/schema.ts` for full definitions.

**Key tables:**
- `transactions` — Financial transactions with composite IDs
- `categories` — Transaction categories with optional `noRollover` flag

## API Authentication

All `/api/*` routes require session authentication via `getUserIdFromRequest(request)`:

```typescript
import { getUserIdFromRequest } from '@/lib/auth/api';

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // use userId in queries...
}
```

**Never hardcode userId** — always use the session-derived userId.

## Debugging Auth Issues

If API returns `{ error: 'Unauthorized' }` but dashboard works:
1. Check browser console: `fetch('/api/transactions?limit=1').then(r=>r.json()).then(console.log)`
2. Verify userId matches actual database records

## Budget Rollover

Categories can have `noRollover=true` (e.g., "Savings"):
- Don't accumulate unused budget from previous months
- Show a "No Rollover" badge on budget cards

## Standards & Reference

Consult these docs for detailed guidance:

| Doc | Purpose |
|-----|---------|
| `.claude/docs/standards/PERMISSIONS.md` | Pre-approved operations |
| `.claude/docs/standards/CODING_RULES.md` | TypeScript & Next.js patterns |
| `.claude/docs/standards/TESTING_GUIDE.md` | Testing patterns |
| `.claude/docs/standards/COMMON_ERRORS.md` | Common errors & fixes |

---

**Version**: 1.1
