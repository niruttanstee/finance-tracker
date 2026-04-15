'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/button';
import { Settings, LogOut } from 'lucide-react';

export function Navigation() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
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
            <Link href="/settings" aria-label="Settings">
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
      </div>
    </nav>
  );
}
