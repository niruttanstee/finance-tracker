# App Launcher Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the finance tracker into a platform launcher with app icons on `/` and the finance app at `/finance/*`.

**Architecture:** Next.js 14 app with route group `(finance)` for finance pages, new launcher homepage at `app/page.tsx`, shared session cookie at root domain level, middleware guarding `/finance/*` routes.

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, shadcn/ui, Drizzle ORM, PostgreSQL

---

## File Structure

```
app/
  page.tsx                          # ← NEW: Launcher homepage (replaces current finance dashboard)
  (finance)/                        # ← NEW: Route group for finance app
    layout.tsx                      # ← NEW: Finance layout with back button header
    page.tsx                        # ← NEW: Finance dashboard (moved from app/page.tsx)
    transactions/page.tsx           # ← MOVED from app/transactions/page.tsx
    budgets/page.tsx                # ← MOVED from app/budgets/page.tsx
    settings/page.tsx               # ← MOVED from app/settings/page.tsx
  login/page.tsx                    # ← EXISTING: Login page (unchanged)
  layout.tsx                        # ← MODIFIED: Conditionally hide Navigation for finance routes
  api/                              # ← EXISTING: All API routes (unchanged, stay at /api/*)

components/
  platform/                         # ← NEW: Platform UI components
    AppIcon.tsx                     # ← NEW
    AppGrid.tsx                      # ← NEW
    icons/
      FinanceIcon.tsx               # ← NEW: Finance SVG icon component
  Navigation.tsx                    # ← MODIFIED: Hide for finance app routes

lib/
  platform/
    apps.ts                        # ← NEW: App config array

middleware.ts                        # ← MODIFIED: Guard /finance/* routes
```

---

## Task 1: Create App Config

**Files:**
- Create: `lib/platform/apps.ts`

- [ ] **Step 1: Create lib/platform directory and apps.ts**

```typescript
// lib/platform/apps.ts
export interface PlatformApp {
  name: string;
  slug: string;
  route: string;
  description: string;
}

export const platformApps: PlatformApp[] = [
  {
    name: 'Finance',
    slug: 'finance',
    route: '/finance',
    description: 'Track income, expenses, and budgets',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add lib/platform/apps.ts
git commit -m "feat: add platform app config"
```

---

## Task 2: Create Finance Icon SVG Component

**Files:**
- Create: `components/platform/icons/FinanceIcon.tsx`

- [ ] **Step 1: Create components/platform/icons/ directory and FinanceIcon.tsx**

```typescript
// components/platform/icons/FinanceIcon.tsx
'use client';

export function FinanceIcon({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/platform/icons/FinanceIcon.tsx
git commit -m "feat: add finance icon SVG component"
```

---

## Task 3: Create AppIcon and AppGrid Components

**Files:**
- Create: `components/platform/AppIcon.tsx`
- Create: `components/platform/AppGrid.tsx`

- [ ] **Step 1: Create AppIcon.tsx**

```typescript
// components/platform/AppIcon.tsx
'use client';

import Link from 'next/link';
import type { PlatformApp } from '@/lib/platform/apps';

interface AppIconProps {
  app: PlatformApp;
  icon: React.ReactNode;
}

export function AppIcon({ app, icon }: AppIconProps) {
  return (
    <Link
      href={app.route}
      className="flex flex-col items-center gap-3 group cursor-pointer"
    >
      <div className="w-[76px] h-[76px] rounded-[18px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-lg">
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground">{app.name}</span>
    </Link>
  );
}
```

- [ ] **Step 2: Create AppGrid.tsx**

```typescript
// components/platform/AppGrid.tsx
'use client';

import type { PlatformApp } from '@/lib/platform/apps';

interface AppGridProps {
  apps: PlatformApp[];
  iconComponents: Record<string, React.ReactNode>;
}

export function AppGrid({ apps, iconComponents }: AppGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-xl mx-auto">
      {apps.map((app) => (
        <div
          key={app.slug}
          className="flex flex-col items-center gap-3"
        >
          <Link
            href={app.route}
            className="flex flex-col items-center gap-3 group cursor-pointer"
          >
            <div className="w-[76px] h-[76px] rounded-[18px] flex items-center justify-center transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
              {iconComponents[app.slug]}
            </div>
            <span className="text-sm font-medium text-foreground">{app.name}</span>
          </Link>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/platform/AppIcon.tsx components/platform/AppGrid.tsx
git commit -m "feat: add AppIcon and AppGrid platform components"
```

---

## Task 4: Create Launcher Homepage

**Files:**
- Modify: `app/page.tsx` (replace current finance dashboard with launcher)
- Create: `components/platform/FinanceIconWrapper.tsx` (gradient wrapper for finance icon)

- [ ] **Step 1: Create FinanceIconWrapper with gradient background**

```typescript
// components/platform/icons/FinanceIconWrapper.tsx
'use client';

export function FinanceIconWrapper() {
  return (
    <div
      className="w-[76px] h-[76px] rounded-[18px] flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #10b981, #059669)',
        boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)',
      }}
    >
      <svg
        className="w-9 h-9 text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Replace app/page.tsx with launcher homepage**

Read the current file first, then replace it entirely with:

```tsx
// app/page.tsx — NEW launcher homepage
'use client';

import { platformApps } from '@/lib/platform/apps';
import { FinanceIconWrapper } from '@/components/platform/icons/FinanceIconWrapper';

const iconComponents = {
  finance: <FinanceIconWrapper />,
};

export default function LauncherPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-xl px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {platformApps.map((app) => (
            <a
              key={app.slug}
              href={app.route}
              className="flex flex-col items-center gap-3 group cursor-pointer"
            >
              <div className="transition-transform duration-200 group-hover:scale-105 flex items-center justify-center">
                {iconComponents[app.slug]}
              </div>
              <span className="text-sm font-medium text-foreground">{app.name}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/platform/icons/FinanceIconWrapper.tsx app/page.tsx
git commit -m "feat: add launcher homepage with app icon grid"
```

---

## Task 5: Create Finance Route Group

**Files:**
- Create: `app/(finance)/layout.tsx`
- Create: `app/(finance)/page.tsx` (moved from current app/page.tsx)
- Move: `app/transactions/page.tsx` → `app/(finance)/transactions/page.tsx`
- Move: `app/budgets/page.tsx` → `app/(finance)/budgets/page.tsx`
- Move: `app/settings/page.tsx` → `app/(finance)/settings/page.tsx`

- [ ] **Step 1: Create app/(finance)/layout.tsx**

```tsx
// app/(finance)/layout.tsx
'use client';

import { useRouter } from 'next/navigation';

interface FinanceLayoutProps {
  children: React.ReactNode;
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      {/* App Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1 flex justify-center">
            <span className="text-sm font-semibold">Finance</span>
          </div>
          <div className="w-[60px]" />
        </div>
      </header>
      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create app/(finance)/page.tsx (copy of current app/page.tsx)**

Copy the current `app/page.tsx` content into `app/(finance)/page.tsx`.

- [ ] **Step 3: Move page files to route group**

```bash
mv app/transactions app/\(finance\)/transactions
mv app/budgets app/\(finance\)/budgets
mv app/settings app/\(finance\)/settings
mv app/page.tsx app/\(finance\)/page.tsx
```

- [ ] **Step 4: Verify file structure**

```bash
ls -la app/\(finance\)/
# Should show: layout.tsx, page.tsx, transactions/, budgets/, settings/
```

- [ ] **Step 5: Commit**

```bash
git add app/\(finance\)/layout.tsx app/\(finance\)/page.tsx
git add app/\(finance\)/transactions app/\(finance\)/budgets app/\(finance\)/settings
git add app/\(finance\)/page.tsx
git commit -m "feat: create (finance) route group with back button header"
```

---

## Task 6: Update Root Layout — Hide Navigation for Finance Routes

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 2: Update app/layout.tsx — remove Navigation**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "./components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Platform",
  description: "Your app launcher",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify login page still works** — The login page uses its own standalone UI (Card component), doesn't import Navigation. No changes needed there.

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx
git commit -m "refactor: remove Navigation from root layout (finance app uses app header)"
```

---

## Task 7: Update Middleware — Guard /finance/* Routes

**Files:**
- Modify: `middleware.ts`

- [ ] **Step 1: Update middleware to guard /finance/* routes**

Read the current middleware, then replace:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookie, COOKIE_NAME } from './lib/auth/session';

const PUBLIC_PATHS = ['/api/auth/login', '/login'];
const PROTECTED_PREFIXES = ['/api/', '/finance'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public auth endpoints
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow non-protected routes (e.g., root `/` launcher)
  if (!PROTECTED_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Extract session cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) {
    // For page requests, redirect to login; for API, return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify HMAC signature
  const sessionId = await verifySessionCookie(cookieValue);
  if (!sessionId) {
    if (pathname.startsWith('/api')) {
      const response = NextResponse.json({ error: 'Invalid session' }, { status: 401 });
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  // Attach sessionId to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-session-id', sessionId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).)*'],
};
```

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat: update middleware to guard /finance/* routes and redirect to /login"
```

---

## Task 8: Update Login Page for Redirect Support

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Update login page to redirect to /finance after login**

Current code redirects to `/` after successful login. Change `router.push('/')` to redirect to `/finance` by default, with support for the `redirect` query param.

Read the current file, then change line 29:

```typescript
// Before (line 29):
router.push('/');

// After:
const redirectTo = searchParams.get('redirect') || '/finance';
router.push(redirectTo);
router.refresh();
```

And update the function signature to read searchParams:

```typescript
import { useSearchParams } from 'next/navigation';

// In component:
const searchParams = useSearchParams();
```

Note: `useSearchParams` requires a Suspense boundary around the component or the page. The cleanest approach is to wrap the inner form in a Suspense:

```tsx
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ... existing form logic, updated redirect
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/login/page.tsx
git commit -m "fix: login redirects to /finance or redirect param after success"
```

---

## Task 9: Verify Full Flow

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Visit /**

Should show launcher with Finance icon (no Navigation visible).

- [ ] **Step 3: Click Finance icon**

Should navigate to `/finance` and show Finance dashboard with back button header.

- [ ] **Step 4: Click Back button**

Should navigate back to `/`.

- [ ] **Step 5: Test auth guard** — log out and visit `/finance`

Should redirect to `/login`.

- [ ] **Step 6: Run lint**

```bash
npm run lint
```

Expected: no errors

---

## Spec Coverage Check

| Spec Section | Tasks Covering It |
|-------------|-----------------|
| Launcher homepage with icon grid | Task 4 |
| Route groups for finance app | Task 5 |
| Back button header | Task 5 |
| App config file | Task 1 |
| Auth guard + redirect | Task 7, Task 8 |
| Responsive grid layout | Task 4 |
| Finance icon with gradient | Task 2, Task 4 |
| Navigation hidden for finance routes | Task 6 |

## Self-Review

- All file paths are exact
- All code blocks are complete (no TODOs, no placeholders)
- Task 6 (login page check) needs a conditional step after reading the file — that's intentional
- Moving pages with `mv` in bash steps is correct for the worktree shell context
