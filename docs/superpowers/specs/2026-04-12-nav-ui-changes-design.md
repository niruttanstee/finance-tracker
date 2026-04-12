# Navigation & UI Changes Design

## Overview

UI polish changes to the finance tracker navigation bar and sync/upload notifications.

## Changes

### 1. Navigation Component (`app/components/Navigation.tsx`)

**Budgets link:**
- Remove `Wallet` icon — text-only link
- Current: `<Link href="/budgets" className="..."><Wallet className="h-4 w-4" />Budgets</Link>`
- New: `<Link href="/budgets">Budgets</Link>`

**Active state highlighting:**
- Use `usePathname()` to detect current route
- Active link gets `bg-muted` class for background highlight
- Apply to: Dashboard (`/`), Budgets (`/budgets`), Transactions (`/transactions`)

**Settings link → icon button:**
- Change from text link to icon button using `Settings` (cog) icon from lucide-react
- Use `variant="outline"` and `size="icon"` from Button component

**ThemeToggle styling:**
- Current: `variant="ghost"`
- Change to: `variant="outline"`

**Logout button:**
- Current: text button
- New: `outline` + `destructive` variant button

### 2. SyncButton Component (`app/components/SyncButton.tsx`)

**Upload icon animation:**
- Remove `animate-spin` class from Upload icon
- Current: `<Upload className={`mr-2 h-4 w-4 ${isActive ? 'animate-spin' : ''}`} />`
- New: `<Upload className="mr-2 h-4 w-4" />` (no spin on upload)

### 3. Sonner Notifications

**Install:** `npx shadcn@latest add sonner`

**Replace inline result display:**
- Remove the inline `{result && <div className="...">}` result block
- Add `import { toast } from 'sonner'` to SyncButton
- Show toast on success/failure instead:
  - Success: `toast.success(message)`
  - Error: `toast.error(message)`

**Toast messages:**
- Wise sync success: `"Synced successfully: {inserted} new, {updated} updated"`
- Wise sync error: `{error}` or `"Sync failed"`
- Upload success: `"{bank}: {total} transactions ({inserted} new, {updated} updated)"`
- Upload error: `{error}` or `"Import failed"`

## Components Modified

| File | Changes |
|------|---------|
| `app/components/Navigation.tsx` | Active highlighting, icon removal, button variants |
| `app/components/SyncButton.tsx` | Remove spin animation, add sonner toasts |
| `app/components/ThemeToggle.tsx` | Change to outline variant (via parent) |
| `app/layout.tsx` | Add `<Toaster />` component for sonner |
| `package.json` / components.json | Add sonner shadcn component |

## No Changes

- No new API routes
- No database schema changes
- No authentication flow changes
