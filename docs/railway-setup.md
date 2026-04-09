# Railway Deployment

> **Note:** This guide covers Railway deployment with PostgreSQL. The multi-user auth feature requires PostgreSQL (SQLite is not compatible with Railway's ephemeral filesystem).

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

# Run migrations
npm run db:push

# Seed admin user
npm run db:init

# Deploy
npm run build && npm start
```

Railway will automatically detect Next.js and run `npm run build` on deploy. Set environment variables in the Railway dashboard.

## Verify Deployment

1. After deploy completes, visit your Railway app URL
2. You should be redirected to login (or see the login page)
3. Log in with the `SEED_ADMIN_USER` / `SEED_ADMIN_PASSWORD` credentials
4. If you see the dashboard, the deployment is working

If you see a "Database initialization failed" error, check that:
- `DATABASE_URL` is correctly set
- `SESSION_SECRET` is at least 32 characters
