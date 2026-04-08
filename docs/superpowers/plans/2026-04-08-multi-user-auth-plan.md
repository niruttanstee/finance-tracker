# Multi-User Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-user authentication with username/password + signed HTTP-only session cookies. Migrate from SQLite to PostgreSQL. No public registration — superuser creates users via CLI.

**Architecture:** HTTP-only signed cookie sessions. Middleware validates session on every API request and attaches `userId` to request headers. All API routes filter by `userId` from middleware-attached header.

**Tech Stack:** bcrypt (password hashing), HMAC-SHA256 (cookie signing), PostgreSQL + Drizzle ORM, Next.js middleware

---

## File Map

```
lib/db.ts                       Modify: PostgreSQL connection
lib/schema.ts                   Modify: add users/sessions tables, add userId to existing tables
lib/auth/session.ts             Create: HMAC cookie signing + session helpers
lib/auth/password.ts            Create: bcrypt password hashing
middleware.ts                   Create: session validation, attaches userId to request headers
app/api/auth/login/route.ts      Create: POST login
app/api/auth/logout/route.ts     Create: DELETE logout
app/api/auth/me/route.ts         Create: GET current user
scripts/init-db.ts              Modify: create auth tables + seed admin user
scripts/create-user.ts          Create: CLI for creating additional users
docs/railway-setup.md            Create: Railway deployment guide
.env.example                     Create: new env vars
```

---

## Task 1: PostgreSQL Connection

**Files:**
- Modify: `lib/db.ts:1-62`

- [ ] **Step 1: Replace lib/db.ts for PostgreSQL**

Replace the entire file content:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export async function initDb() {
  // Tables are created via Drizzle migrations (drizzle-kit push)
  // This function is kept for backwards compatibility
}
```

- [ ] **Step 2: Install postgres-js**

Run: `npm install postgres drizzle-orm && npm install -D @types/postgres`

- [ ] **Step 3: Commit**

```bash
git add lib/db.ts package.json package-lock.json
git commit -m "feat: switch db connection from sqlite to postgresql"
```

---

## Task 2: Auth Schema

**Files:**
- Modify: `lib/schema.ts`

- [ ] **Step 1: Add users and sessions tables to lib/schema.ts**

Add after the `settings` table definition (before `export type Transaction`):

```typescript
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // uuid
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['superuser', 'user'] }).notNull().default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // 32-byte random hex
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});
```

- [ ] **Step 2: Add userId to transactions, categories, categoryBudgets, and settings tables**

In `transactions`, add after `profileId`:
```typescript
userId: text('user_id').notNull().default(''),
```

In `categories`, add after `noRollover`:
```typescript
userId: text('user_id').notNull().default(''),
```

In `categoryBudgets`, add after `updatedAt`:
```typescript
userId: text('user_id').notNull().default(''),
```

In `settings`, add after `updatedAt`:
```typescript
userId: text('user_id').notNull().default(''),
```

- [ ] **Step 3: Add inferred types**

After existing type exports, add:
```typescript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
```

- [ ] **Step 4: Commit**

```bash
git add lib/schema.ts
git commit -m "feat: add users, sessions tables and userId to existing tables"
```

---

## Task 3: Auth Utilities

**Files:**
- Create: `lib/auth/session.ts`
- Create: `lib/auth/password.ts`

- [ ] **Step 1: Create lib/auth/session.ts**

```typescript
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET!;
const COOKIE_NAME = 'sessionId';
const SEPARATOR = '.';

export interface SessionCookie {
  id: string;
  signature: string;
}

/**
 * Sign a session ID with HMAC-SHA256.
 * Cookie value format: ${sessionId}.${hmacSignature}
 */
export function signSession(sessionId: string): string {
  const hmac = createHmac('sha256', SECRET);
  hmac.update(sessionId);
  const signature = hmac.digest('hex');
  return `${sessionId}${SEPARATOR}${signature}`;
}

/**
 * Verify the HMAC signature of a session cookie.
 * Returns the sessionId if valid, null if tampered.
 */
export function verifySessionCookie(cookie: string): string | null {
  const lastDot = cookie.lastIndexOf(SEPARATOR);
  if (lastDot === -1) return null;
  const sessionId = cookie.slice(0, lastDot);
  const providedSignature = cookie.slice(lastDot + 1);
  const hmac = createHmac('sha256', SECRET);
  hmac.update(sessionId);
  const expectedSignature = hmac.digest('hex');
  // Use timing-safe comparison to prevent timing attacks
  try {
    const a = Buffer.from(providedSignature, 'hex');
    const b = Buffer.from(expectedSignature, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
    return sessionId;
  } catch {
    return null;
  }
}

/**
 * Generate a cryptographically random session ID (32 bytes hex).
 */
export function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

export { COOKIE_NAME };
```

- [ ] **Step 2: Create lib/auth/password.ts**

```typescript
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Hash a password with bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

- [ ] **Step 3: Install bcrypt**

Run: `npm install bcrypt && npm install -D @types/bcrypt`

- [ ] **Step 4: Commit**

```bash
git add lib/auth/session.ts lib/auth/password.ts package.json package-lock.json
git commit -m "feat: add session signing and password hashing utilities"
```

---

## Task 4: Session Middleware

**Files:**
- Create: `middleware.ts` (root of project)

- [ ] **Step 1: Create middleware.ts**

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from './lib/db';
import { sessions, users } from './lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import { verifySessionCookie, COOKIE_NAME } from './lib/auth/session';

const PUBLIC_PATHS = ['/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth endpoints without session
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow non-API routes (pages, static assets)
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Extract session cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify HMAC signature
  const sessionId = verifySessionCookie(cookieValue);
  if (!sessionId) {
    const response = NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Look up session in DB
  const now = new Date();
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(
      eq(sessions.id, sessionId),
      gt(sessions.expiresAt, now)
    ))
    .limit(1);

  if (!session) {
    const response = NextResponse.json({ error: 'Session expired' }, { status: 401 });
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Attach userId to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', session.userId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/api/:path*'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: add session validation middleware"
```

---

## Task 5: Auth API Routes

**Files:**
- Create: `app/api/auth/login/route.ts`
- Create: `app/api/auth/logout/route.ts`
- Create: `app/api/auth/me/route.ts`

- [ ] **Step 1: Create app/api/auth/login/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, sessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth/password';
import { generateSessionId, signSession, COOKIE_NAME } from '@/lib/auth/session';

const SESSION_DURATION_DAYS = 30;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Verify password
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Create session
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    expiresAt,
    createdAt: new Date(),
  });

  // Set signed cookie
  const cookieValue = signSession(sessionId);
  const response = NextResponse.json({ user: { id: user.id, username: user.username, role: user.role } });
  response.cookies.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  });

  return response;
}
```

- [ ] **Step 2: Create app/api/auth/logout/route.ts**

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sessions } from '@/lib/schema';
import { verifySessionCookie, COOKIE_NAME } from '@/lib/auth/session';

export async function DELETE(request: Request) {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue) {
    const sessionId = verifySessionCookie(cookieValue);
    if (sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
```

- [ ] **Step 3: Create app/api/auth/me/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db
    .select({ id: users.id, username: users.username, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user });
}
```

- [ ] **Step 4: Fix import in logout route**

The logout route uses `request.cookies` but the type is `Request`, not `NextRequest`. Fix:

```typescript
// Change: export async function DELETE(request: Request) {
// To: export async function DELETE(request: NextRequest) {
```

- [ ] **Step 5: Commit**

```bash
git add app/api/auth/login/route.ts app/api/auth/logout/route.ts app/api/auth/me/route.ts
git commit -m "feat: add auth API routes (login, logout, me)"
```

---

## Task 6: Init DB Script + Admin Seeding

**Files:**
- Modify: `scripts/init-db.ts`
- Create: `scripts/create-user.ts`

- [ ] **Step 1: Update scripts/init-db.ts**

Update the `initDb()` function to create auth tables and seed admin user:

```typescript
import { initDb as initPostgres, db } from '../lib/db.js';
import { categories, users } from '../lib/schema.js';
import { hashPassword } from '../lib/auth/password.js';

async function main() {
  console.log('Initializing database...');

  // Create tables (for SQLite-style init, or run drizzle-kit push for Postgres)
  if (process.env.DATABASE_URL?.startsWith('sqlite') || !process.env.DATABASE_URL) {
    // SQLite compatibility mode (local dev without Postgres)
    initPostgres();
  }

  // Seed default categories for the admin user
  const adminUsername = process.env.SEED_ADMIN_USER || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';

  // Check if admin exists
  const existingAdmin = await db.select().from(users).limit(1);
  if (existingAdmin.length === 0) {
    const passwordHash = await hashPassword(adminPassword);
    const { v4: uuidv4 } = await import('uuid');
    await db.insert(users).values({
      id: uuidv4(),
      username: adminUsername,
      passwordHash,
      role: 'superuser',
      createdAt: new Date(),
    });
    console.log(`Admin user created: ${adminUsername}`);
  }

  // Seed default categories
  const defaultCategories = [
    { id: 'food', name: 'Food & Dining', color: '#ef4444', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'shopping', name: 'Shopping', color: '#f97316', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'transport', name: 'Transportation', color: '#eab308', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'bills', name: 'Bills & Utilities', color: '#22c55e', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'entertainment', name: 'Entertainment', color: '#3b82f6', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'healthcare', name: 'Healthcare', color: '#a855f7', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'travel', name: 'Travel', color: '#ec4899', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'income', name: 'Income', color: '#14b8a6', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'savings', name: 'Savings', color: '#10b981', isDefault: true, noRollover: true, defaultBudget: 0, userId: '' },
    { id: 'other', name: 'Other', color: '#6b7280', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }

  console.log('Database initialized successfully');
  process.exit(0);
}

main().catch(console.error);
```

Also update the imports at the top to include the new modules.

- [ ] **Step 2: Install uuid**

Run: `npm install uuid && npm install -D @types/uuid`

- [ ] **Step 3: Commit**

```bash
git add scripts/init-db.ts package.json package-lock.json
git commit -m "feat: update init-db to seed admin user and use postgres"
```

---

## Task 7: User Creation CLI

**Files:**
- Create: `scripts/create-user.ts`

- [ ] **Step 1: Create scripts/create-user.ts**

```typescript
import { db } from '../lib/db.js';
import { users } from '../lib/schema.js';
import { hashPassword } from '../lib/auth/password.js';
import { v4 as uuidv4 } from 'uuid';

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: npx tsx scripts/create-user.ts <username> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const id = uuidv4();

  try {
    await db.insert(users).values({
      id,
      username,
      passwordHash,
      role: 'user',
      createdAt: new Date(),
    });
    console.log(`User created: ${username} (id: ${id})`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      console.error(`Username '${username}' already exists`);
      process.exit(1);
    }
    throw error;
  }

  process.exit(0);
}

main().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add scripts/create-user.ts
git commit -m "feat: add CLI script for creating users"
```

---

## Task 8: Env Example + Railway Setup

**Files:**
- Create: `.env.example`
- Create: `docs/railway-setup.md`

- [ ] **Step 1: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Session signing (generate with: openssl rand -hex 32)
SESSION_SECRET=your-64-char-hex-secret-here

# Initial admin account (only used during db:init)
SEED_ADMIN_USER=admin
SEED_ADMIN_PASSWORD=your-secure-password
```

- [ ] **Step 2: Create docs/railway-setup.md**

```markdown
# Railway Deployment

## PostgreSQL Setup

1. Go to [railway.io](https://railway.io) and create a new project
2. Add a PostgreSQL database (Provision → PostgreSQL)
3. Copy the `DATABASE_URL` from the PostgreSQL connection variables

## Environment Variables

Set in Railway project settings:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | From PostgreSQL add-on |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `SEED_ADMIN_USER` | Your admin username |
| `SEED_ADMIN_PASSWORD` | Your admin password |

## Deploy

```bash
# Set env vars locally for testing
cp .env.example .env.local
# Edit .env.local with your values

# Run migrations (creates tables)
npm run db:init

# Deploy
npm run build && npm start
```

Railway will automatically run `npm run build` on deploy. Set the start command in railway.json or Railway project settings if needed.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example docs/railway-setup.md
git commit -m "docs: add env example and railway deployment guide"
```

---

## Task 9: Drizzle Config Update

**Files:**
- Modify: `drizzle.config.ts` (or `drizzle.config.js`)

- [ ] **Step 1: Check existing drizzle config**

Run: `cat drizzle.config.ts` (or `ls drizzle.config.*`)

- [ ] **Step 2: Update drizzle config for PostgreSQL**

Most likely the existing config uses SQLite driver. Update to postgres:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

If no `dialect` field exists, add it. If it uses `driver: 'better-sqlite'`, replace with `dialect: 'postgresql'`.

- [ ] **Step 3: Commit**

```bash
git add drizzle.config.ts
git commit -m "feat: update drizzle config for postgresql"
```

---

## Self-Review Checklist

- [ ] All schema changes from spec covered (users, sessions, userId on all tables)
- [ ] Session cookie uses HMAC signing (not just random ID)
- [ ] Middleware attaches x-user-id header to all API requests
- [ ] bcrypt cost factor 12
- [ ] Session expiry checked in middleware (not just DB lookup)
- [ ] Logout deletes session from DB
- [ ] SEED_ADMIN_USER creates superuser with role='superuser'
- [ ] create-user.ts creates with role='user' only
- [ ] No placeholders or TODOs in implementation steps
