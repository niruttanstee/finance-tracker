import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold">
              Finance Tracker
            </Link>
            <div className="flex gap-4">
              <Link href="/" className="text-sm hover:text-primary">
                Dashboard
              </Link>
              <Link href="/transactions" className="text-sm hover:text-primary">
                Transactions
              </Link>
              <Link href="/settings" className="text-sm hover:text-primary">
                Settings
              </Link>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
