# App Launcher Platform — Design Spec

**Date:** 2026-04-14
**Status:** Draft

---

## 1. Overview

Transform the existing finance tracker into a **platform launcher** — a parent application that displays app icons on the homepage and routes to child apps via sub-paths. The platform starts with one app (Finance) and is designed to grow with future apps (Notes, Tasks, Health, etc.).

**Guiding principle:** Simple, config-driven, extensible without overhead.

---

## 2. Architecture

### 2.1 Monorepo with Sub-Apps

Single Next.js 14 app with the following route structure:

| Route | Purpose |
|-------|---------|
| `/` | Launcher homepage (app icon grid) |
| `/finance/*` | Finance child app (all routes) |
| `/notes/*` | Notes child app (future) |
| `/tasks/*` | Tasks child app (future) |

### 2.2 Route Groups

Finance app routes are organized under a **route group** `(finance)` so the URL path reflects the app name without affecting relative navigation inside the app.

```
app/
  page.tsx                  # Launcher homepage
  (finance)/
    layout.tsx               # Finance layout (back button header)
    transactions/page.tsx   # → /finance/transactions
    budgets/page.tsx        # → /finance/budgets
    page.tsx                # → /finance
  (notes)/
    ...
  layout.tsx                 # Root layout (auth, providers)
```

### 2.3 App Config File

Apps are registered in `lib/platform/apps.ts` — a hardcoded array of app definitions:

```typescript
export const platformApps = [
  {
    name: 'Finance',
    slug: 'finance',
    route: '/finance',
    icon: FinanceIcon, // SVG component
    description: 'Track income, expenses, and budgets',
  },
  // future apps added here
];
```

The launcher homepage reads `platformApps` to render the icon grid. No runtime DB lookup.

### 2.4 Database Schema

**Shared PostgreSQL database with per-app schemas** using Drizzle ORM.

- Each app gets its own schema namespace (e.g., `finance.transactions`, `notes.notes`)
- Auth/users table lives in `public` schema (shared across all apps)
- Drizzle config uses schema folders: `drizzle/finance/`, `drizzle/notes/`

### 2.5 Authentication

- Uses existing `users` table from the finance tracker
- Browser **HTTP Basic Auth popup** (native browser dialog) for login
- Session cookie set at **root domain level** (`.example.com` or `localhost`) so it's shared across all apps
- Middleware checks for valid session cookie on all protected routes
- Unauthenticated users see the launcher homepage but are prompted to authenticate when clicking an app

---

## 3. Launcher Homepage

### 3.1 Layout

- **Responsive auto-fit grid** — icons size to fill, adapts to screen and app count
- **Icons + names** — each app shows a custom illustrated icon with the app name below
- No title/header on the launcher — just the grid
- Dark background (inherits theme)

### 3.2 App Icon Design

- Custom illustrated SVG icons (one per app)
- Gradient backgrounds per app (distinct colors per app for visual differentiation)
- Rounded corners (18px radius)
- Subtle shadow/glow matching the app's accent color
- Hover effect: slight scale-up (1.05) with shadow intensification

### 3.3 Launcher Components

| Component | Purpose |
|-----------|---------|
| `app/page.tsx` | Launcher homepage, reads `platformApps`, renders icon grid |
| `components/platform/AppIcon.tsx` | Renders a single app icon (SVG icon + name) |
| `components/platform/AppGrid.tsx` | Responsive grid wrapper |
| `lib/platform/apps.ts` | App config array |

---

## 4. Finance App

### 4.1 App Header

Every app route (inside `/finance/*`) gets a **shared layout** with:
- **Back button** on the left → navigates to `/`
- **App name** centered
- Right side is empty (reserved for future actions)

The back button is implemented in `app/(finance)/layout.tsx`.

### 4.2 Navigation

Inside the finance app, existing navigation (sidebar, nav links, etc.) continues to work — all paths are relative and don't need updating.

### 4.3 Auth Guard

Middleware checks the session cookie on all `/finance/*` routes. If unauthenticated:
- The browser's native HTTP Basic Auth popup appears
- On successful auth, the user is redirected to the originally requested page
- On failure, stays on the login prompt

---

## 5. Adding Future Apps

To add a new app (e.g., Notes):

1. **Add route group** `app/(notes)/` with its pages
2. **Add to `platformApps`** in `lib/platform/apps.ts`
3. **Create its Drizzle schema** under `drizzle/notes/`
4. **Done** — launcher auto-shows the new icon

No code changes to the launcher itself.

---

## 6. Component Inventory

### AppIcon
- **Props:** `app: PlatformApp`
- **States:** default, hover (scale 1.05 + intensified shadow)
- **Visual:** 76×76px icon with gradient background, app name below

### AppGrid
- **Props:** `apps: PlatformApp[]`
- **Behavior:** CSS grid with `auto-fit` and `minmax(110px, 1fr)`

### Finance Layout (`app/(finance)/layout.tsx`)
- Renders `AppHeader` + children
- Wraps all `/finance/*` routes

### AppHeader
- **Props:** `appName: string`
- **Visual:** Back button (left) + centered app name + empty right

---

## 7. Tech Stack Confirmation

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14 (App Router) — existing |
| UI Library | shadcn/ui components + Tailwind CSS |
| Auth | HTTP Basic Auth popup + session cookie |
| Database | PostgreSQL + Drizzle ORM — existing |
| App icons | Custom SVG components |
| App config | Hardcoded JS array in `lib/platform/apps.ts` |
| Session cookie | Root domain (shared across all sub-paths) |

---

## 8. What's Out of Scope

- Login/signup page (HTTP Basic Auth popup is the login)
- Admin UI for managing apps
- Per-app user permissions (all authed users can access all apps)
- App marketplace or discovery
- Notes/Tasks/Health implementations (placeholders only)

---

## 9. Open Questions

| Question | Decision |
|----------|----------|
| Cookie domain for production | `.yourdomain.com` — requires env var |
| How to handle app icons (SVG vs image) | SVG components, stored in `components/platform/icons/` |
| Dark/light theme for launcher | Inherits current dark theme |
| Mobile layout for launcher | Same responsive grid, icons scale down slightly |
