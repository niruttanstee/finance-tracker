# Finance Tracker - Project Context

## Quick Start

```bash
npm run dev          # Start dev server
npm run db:init      # Initialize database
npx tsx scripts/cleanup-duplicates.ts  # Fix duplicates
```

## Tech Stack

- **Framework:** Next.js 14 App Router + React 18 + TypeScript
- **Database:** SQLite + Drizzle ORM
- **UI:** shadcn/ui + Tailwind CSS
- **API:** Wise API for transaction syncing

## Database Schema

See `lib/schema.ts` for full definitions.

**Key tables:**
- `transactions` - Financial transactions with composite IDs
- `categories` - Transaction categories

## Critical: Transaction ID Strategy

**⚠️ Do NOT use Wise's transactionId** - it's inconsistent across balance statements.

**Composite ID format:** `{unix_timestamp}_{merchant}_{amount}_{currency}`
```
Example: 1775020189_Dodo_Korea_Pav_Dmsr_24_00_MYR
```

**Implementation:** `app/api/sync/route.ts:7-11`

**Why:** Same transaction appears in multiple Wise balance accounts (USD, EUR, MYR) with different IDs. Composite IDs prevent duplicates.

## Key Files

| File | Purpose |
|------|---------|
| `app/api/sync/route.ts` | Wise sync endpoint |
| `app/api/transactions/route.ts` | Transaction API (GET/PATCH) |
| `app/transactions/page.tsx` | Transaction list UI |
| `lib/transactions.ts` | DB operations |
| `lib/wise.ts` | Wise API client |
| `scripts/cleanup-duplicates.ts` | Migration to fix existing duplicates |

## Sync Flow

1. Fetch Wise profiles
2. For each balance account → fetch statement (12 months)
3. Parse transactions, generate composite IDs
4. Insert new / update existing (preserving categories)

## Environment Variables

```bash
WISE_API_TOKEN=your_token_here  # Required for sync
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Transactions showing 3x | Run cleanup script, check composite IDs are generating |
| Sync fails | Check `WISE_API_TOKEN`, rate limits, permissions |
| Missing categories | Run `npm run db:init` to seed defaults |

## Architecture Notes

- **Dates:** SQLite stores Unix timestamps (integers), Drizzle auto-converts to JS Date
- **Components:** `'use client'` for client-side, default for server components
- **StrictMode:** Enabled (causes double useEffect in development)
- **Database:** `data/finance.db` (auto-created)

## Links

- [Next.js 14](https://nextjs.org/docs/app)
- [Drizzle ORM](https://orm.drizzle.team/docs/get-started-sqlite)
- [Wise API](https://docs.wise.com/)
