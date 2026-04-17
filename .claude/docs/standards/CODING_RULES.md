# Coding Rules

## 1. TypeScript & Next.js Patterns

### "use client" Directive
Only add `"use client"` when you need browser APIs or interactivity. Default to Server Components.

```typescript
// ✅ Server Component (default) - no directive needed
export default function TransactionsPage() {
  return <div>...</div>
}

// ✅ Client Component - needs interactivity
"use client"
import { useState } from 'react'
export function TransactionList() {
  const [filter, setFilter] = useState('')
  return <div>...</div>
}
```

### Type Safety
- Never use `any` — use `unknown` instead
- Define interfaces for API responses
```typescript
// ❌ Bad
function handleData(data: any) { ... }

// ✅ Good
interface Transaction {
  id: string
  amount: number
  currency: string
}
function handleData(data: Transaction) { ... }
```

### Import Ordering
1. React / Next.js built-ins
2. Third-party libraries
3. Internal imports (@/*)
```typescript
import { useState } from 'react'
import { format } from 'date-fns'
import { Transaction } from '@/lib/transactions'
```

## 2. Next.js App Router

### API Routes
- Use Request/Response helpers from `next/server`
- Always handle errors and return appropriate status codes
- **Always authenticate** — use `getUserIdFromRequest(request)` for user-specific routes
- Never hardcode userId — use the session-derived userId from `getUserIdFromRequest`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getUserIdFromRequest } from '@/lib/auth/api'

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // proceed with userId in queries...
}
```

### Dynamic Routes
- Use `generateStaticParams` for static generation
- Validate params with zod at the top of page components

## 3. Component Patterns

### Server Components
- Fetch data directly (no useEffect)
- Can be async
```typescript
export default async function DashboardPage() {
  const transactions = await getTransactions()
  return <TransactionList data={transactions} />
}
```

### Client Components
- Use for: useState, useEffect, event handlers
- Keep as small as possible, push up to leaf components
```typescript
"use client"
export function FilterBar() {
  const [filter, setFilter] = useState('')
  return (
    <input
      value={filter}
      onChange={(e) => setFilter(e.target.value)}
    />
  )
}
```

## 4. Drizzle ORM

### Parameterized Queries
Always use parameterized queries — never raw SQL strings with user input.

```typescript
// ❌ Bad - raw SQL with interpolation
db.execute(sql`SELECT * FROM users WHERE id = ${userId}`)

// ✅ Good - parameterized
db.select().from(users).where(eq(users.id, userId))
```

### Schema Definitions
- Use descriptive names for columns
- Always define types for JSON fields
```typescript
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  amount: real('amount').notNull(),
  merchant: text('merchant'),
  categoryId: text('category_id').references(() => categories.id),
})
```
