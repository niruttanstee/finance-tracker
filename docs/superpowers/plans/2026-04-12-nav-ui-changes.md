# Navigation & UI Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the navigation bar (active highlighting, icon removal, button variants) and replace inline sync/upload results with sonner toasts.

**Architecture:** UI-only changes to existing components. Active nav state via `usePathname()`. Notifications via sonner toasts replacing inline result divs.

**Tech Stack:** Next.js 14, React, Tailwind, shadcn/ui, sonner, lucide-react

---

## Files Modified

| File | Changes |
|------|---------|
| `app/components/Navigation.tsx` | Active highlighting, remove Budgets icon, settings/logout button variants |
| `app/components/SyncButton.tsx` | Remove spin animation, add sonner toasts |
| `app/components/ThemeToggle.tsx` | Pass `variant="outline"` prop |
| `app/layout.tsx` | Add `<Toaster />` for sonner |
| `components/ui/sonner.tsx` | Create via shadcn add |
| `components.json` | Add sonner entry |

---

## Task 1: Install sonner

**Files:**
- Modify: `components.json`
- Create: `components/ui/sonner.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Install sonner via shadcn**

Run: `npx shadcn@latest add sonner`
Expected: Creates `components/ui/sonner.tsx` and updates `components.json`

- [ ] **Step 2: Add Toaster to layout**

Read `app/layout.tsx`, then add `import { Toaster } from '@/components/ui/sonner'` and insert `<Toaster />` before the closing body tag (or in the root layout near the ThemeProvider).

```tsx
import { Toaster } from '@/components/ui/sonner'
// ...
return (
  <html>
    <body>
      <ThemeProvider>...</ThemeProvider>
      <Toaster />
    </body>
  </html>
)
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/sonner.tsx components.json app/layout.tsx
git commit -m "feat: add sonner shadcn component and Toaster to layout"
```

---

## Task 2: Update Navigation component

**Files:**
- Modify: `app/components/Navigation.tsx`
- Modify: `app/components/ThemeToggle.tsx`

- [ ] **Step 1: Add usePathname import and update nav links**

Read `app/components/Navigation.tsx`, then replace the entire component with:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'DELETE' });
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              Finance Tracker
            </Link>
            <div className="flex gap-4">
              <Link
                href="/"
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  isActive('/') ? 'bg-muted text-foreground' : 'hover:text-primary'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/budgets"
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  isActive('/budgets') ? 'bg-muted text-foreground' : 'hover:text-primary'
                }`}
              >
                Budgets
              </Link>
              <Link
                href="/transactions"
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                  isActive('/transactions') ? 'bg-muted text-foreground' : 'hover:text-primary'
                }`}
              >
                Transactions
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" asChild>
              <Link href="/settings" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
            <ThemeToggle />
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

Note: The `Button` component from shadcn/ui uses `asChild` prop for rendering the Link inside. The `destructive` variant already has the red styling.

- [ ] **Step 2: Update ThemeToggle to accept variant prop**

Read `app/components/ThemeToggle.tsx`, then update to accept and pass through the variant:

```tsx
'use client';

import { useTheme } from './ThemeProvider';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'ghost' | 'outline' | 'default';
}

export function ThemeToggle({ variant = 'ghost' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </Button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/components/Navigation.tsx app/components/ThemeToggle.tsx
git commit -m "feat: add active nav highlighting, icon-only settings, outline theme toggle, destructive logout"
```

---

## Task 3: Update SyncButton — remove spin, add sonner toasts

**Files:**
- Modify: `app/components/SyncButton.tsx`

- [ ] **Step 1: Update SyncButton with sonner toasts**

Read `app/components/SyncButton.tsx`, then replace the file content:

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface SyncResult {
  success: boolean;
  inserted?: number;
  updated?: number;
  total?: number;
  bank?: string;
  error?: string;
}

interface SyncButtonProps {
  mode: 'wise' | 'upload';
  onSync?: () => void;
}

export function SyncButton({ mode, onSync }: SyncButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const router = useRouter();

  async function handleWiseSync() {
    setIsActive(true);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setLastSync(new Date());
        onSync?.();
        toast.success(
          `Synced successfully: ${data.inserted ?? 0} new, ${data.updated ?? 0} updated`
        );
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsActive(false);
    }
  }

  async function handleFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsActive(true);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/import', { method: 'POST', body: formData });
        const data = await response.json();

        if (response.ok) {
          setLastSync(new Date());
          router.refresh();
          onSync?.();
          toast.success(
            `${data.bank}: ${data.total} transactions (${data.inserted} new, ${data.updated} updated)`
          );
        } else {
          toast.error(data.error || 'Import failed');
        }
      } catch {
        toast.error('Network error. Please try again.');
      } finally {
        setIsActive(false);
      }
    };
    input.click();
  }

  return (
    <div className="space-y-2">
      {mode === 'wise' ? (
        <Button onClick={handleWiseSync} disabled={isActive} className="w-full">
          <RefreshCw className={`mr-2 h-4 w-4 ${isActive ? 'animate-spin' : ''}`} />
          {isActive ? 'Syncing...' : 'Sync with Wise'}
        </Button>
      ) : (
        <Button onClick={handleFileUpload} disabled={isActive} className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          {isActive ? 'Importing...' : 'Upload Statement'}
        </Button>
      )}

      {lastSync && (
        <p className="text-sm text-muted-foreground text-center">
          {mode === 'wise' ? 'Last synced: ' : 'Last import: '}
          {lastSync.toLocaleString()}
        </p>
      )}
    </div>
  );
}
```

Key changes:
- Removed `FileText` import (no longer used)
- Removed the inline `{result && <div>}` result block entirely
- Added `import { toast } from 'sonner'`
- Removed `animate-spin` from Upload icon (Wise sync still has spin — that wasn't requested to change)
- Added `toast.success()` / `toast.error()` calls instead of `setResult()`

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -50`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add app/components/SyncButton.tsx
git commit -m "feat: replace inline sync results with sonner toasts, remove upload spin animation"
```

---

## Self-Review Checklist

- [ ] Budgets nav link has no Wallet icon
- [ ] Active nav links have `bg-muted` background
- [ ] Settings is an icon button with Settings cog icon, outline variant
- [ ] ThemeToggle uses outline variant
- [ ] Logout is destructive (red) outline button
- [ ] Upload icon does NOT spin
- [ ] Sonner toasts appear on sync/upload success and error
- [ ] `<Toaster />` is present in layout
- [ ] All changes compile without errors
