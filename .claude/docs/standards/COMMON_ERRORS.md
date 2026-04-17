# Common Errors

## 1. ESM/CommonJS — Top-level await

**Error:**
```
Top-level await is currently not supported with the "cjs" output format
```

**Cause:** Script uses top-level `await` but runs as CommonJS.

**Fix:** Rename script to `.mts` extension:
```bash
scripts/foo.ts → scripts/foo.mts
```

Or run with ESM loader:
```bash
npx tsx --loader ts=esm scripts/foo.ts
```

---

## 2. "use client" Directive Missing

**Error:** `Error: cannot read properties of undefined (reading 'useState')`

**Cause:** Using React hooks in a Server Component.

**Fix:** Add `"use client"` at the top of the component file.

---

## 3. Invalid URL in fetch

**Error:** `TypeError: Only absolute URLs are supported`

**Cause:** Using relative URL in server-side fetch.

**Fix:** Use absolute URL or configure base URL:
```typescript
const res = await fetch(new URL('/api/data', request.url))
```

---

## 4. Module Resolution

**Error:** `Cannot find module '@/lib/...'`

**Cause:** Missing or incorrect path alias in `tsconfig.json`.

**Fix:** Ensure `@/*` maps to project root:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

---

## 5. Drizzle: Missing Table Definition

**Error:** `Table "xxx" does not exist`

**Cause:** Table not defined in schema or migration not run.

**Fix:**
```bash
npx drizzle-kit push    # Push schema to database
# or
npm run db:reset   # Reset and resync
```

---

## 6. PostgreSQL Connection Error

**Error:** `Connection refused` or `DATABASE_URL environment variable is required`

**Cause:** PostgreSQL not running or DATABASE_URL not set.

**Fix:** Ensure PostgreSQL is running and DATABASE_URL is set in .env

---

## 7. Wise API Rate Limits

**Error:** `429 Too Many Requests`

**Cause:** Exceeded Wise API rate limit.

**Fix:** Add delay between requests or check token validity in settings.
