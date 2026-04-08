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

# Run migrations
npm run db:push

# Seed admin user
npm run db:init

# Deploy
npm run build && npm start
```

Railway will automatically detect Next.js and run `npm run build` on deploy. Set environment variables in the Railway dashboard.
