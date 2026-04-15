'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Settings, LogOut } from 'lucide-react';

interface FinanceLayoutProps {
  children: React.ReactNode;
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/finance') return pathname === '/finance' || pathname === '/finance/';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'DELETE' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  return (
    <div className="min-h-screen">
      {/* App Header with Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm font-medium text-orange-500 border border-orange-500 hover:bg-orange-50 px-3 py-1.5 rounded-md transition-colors"
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
            <span className="text-sm font-semibold">Finance</span>
          </div>

          {/* Center: Navigation */}
          <nav className="flex items-center gap-4">
            <Link
              href="/finance"
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                isActive('/finance') ? 'bg-muted text-foreground' : 'hover:text-primary'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/finance/budgets"
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                isActive('/finance/budgets') ? 'bg-muted text-foreground' : 'hover:text-primary'
              }`}
            >
              Budgets
            </Link>
            <Link
              href="/finance/transactions"
              className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                isActive('/finance/transactions') ? 'bg-muted text-foreground' : 'hover:text-primary'
              }`}
            >
              Transactions
            </Link>
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Link href="/finance/settings" aria-label="Settings">
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <ThemeToggle variant="outline" />
            <Button variant="outline" size="icon" onClick={handleLogout} aria-label="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      {/* Page Content */}
      <div>{children}</div>
    </div>
  );
}
