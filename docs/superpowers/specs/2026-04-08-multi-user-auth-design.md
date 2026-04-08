# Multi-User Authentication Design

**Date:** 2026-04-08
**Status:** Approved

## Overview

Add multi-user authentication to the finance tracker using username/password + signed HTTP-only session cookies. Users are created manually by the superuser (no public registration). Switch from SQLite to PostgreSQL for Railway compatibility.

---

## Database

### Schema Changes

**New tables:**

```sql
users (id, username, passwordHash, role, createdAt)
sessions (id, userId, expiresAt, createdAt)
```

**Modified tables (add userId):**

- `transactions` — add `userId`
- `categories` — add `userId`
- `categoryBudgets` — add `userId`
- `settings` — add `userId` (each user has their own settings)

### Data Seeding

- `npm run db:init` creates a superuser from `SEED_ADMIN_USER` / `SEED_ADMIN_PASSWORD` env vars
- Existing data (transactions, categories) assigned to the superuser on first migration

---

## Authentication

### Login Flow

1. POST `/api/auth/login` with `{username, password}`
2. Server looks up user by username, verifies password with bcrypt
3. Creates session: random 32-byte ID stored in `sessions` with `userId` and `expiresAt` (30 days)
4. Sets HTTP-only cookie: `sessionId=<id>`, Secure, SameSite=Strict
5. Returns `{user: {id, username, role}}`

### Logout Flow

1. DELETE `/api/auth/logout`
2. Deletes session from DB
3. Clears the cookie

### Session Validation (Middleware)

1. Next.js middleware reads `sessionId` cookie
2. Verifies HMAC signature using `SESSION_SECRET` env var
3. Looks up session in DB, checks expiry
4. Attaches `userId` to request headers for API routes

### Session Signing

- Cookie format: `${sessionId}.${hmacSignature}`
- HMAC-SHA256 using `SESSION_SECRET` env var
- Signature verified before DB lookup prevents tampering

---

## User Management

### User Creation

CLI script: `npx tsx scripts/create-user.ts <username> <password>`

- Inserts user with `role: 'user'`
- Password hashed with bcrypt (cost factor 12)

### Roles

- `superuser` — Can create users, manages shared Wise token
- `user` — Regular user, sees only their own data

---

## API Changes

### New Routes

- `POST /api/auth/login` — Login
- `DELETE /api/auth/logout` — Logout
- `GET /api/auth/me` — Get current user

### Middleware Protection

All `/api/*` routes (except `/api/auth/login`) require valid session cookie. Middleware returns 401 if invalid.

### Data Isolation

All API routes filter queries by `userId` from the session. No cross-user data leakage.

---

## Password Security

- Hashing: bcrypt, cost factor 12
- Never store plain-text passwords
- Never log passwords or session secrets

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | HMAC signing secret (min 32 bytes random) |
| `SEED_ADMIN_USER` | Initial superuser username |
| `SEED_ADMIN_PASSWORD` | Initial superuser password |

---

## Railway Setup

1. Add PostgreSQL add-on in Railway dashboard
2. Set `DATABASE_URL` env var from Railway
3. Set `SESSION_SECRET` to a random 64-char hex string
4. Set `SEED_ADMIN_USER` and `SEED_ADMIN_PASSWORD` for initial account
5. Deploy — `npm run db:init` runs as part of startup if tables don't exist

---

## Local Development

```bash
# Start local PostgreSQL (Docker)
docker run -d -p 5432:5432 -e POSTGRES_DB=finance -e POSTGRES_USER=dev -e POSTGRES_PASSWORD=dev postgres:16

# .env.local
DATABASE_URL=postgresql://dev:dev@localhost:5432/finance
SESSION_SECRET=<generate with: openssl rand -hex 32>
SEED_ADMIN_USER=admin
SEED_ADMIN_PASSWORD=<your-password>
```
