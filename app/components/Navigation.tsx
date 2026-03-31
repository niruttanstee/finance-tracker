import Link from 'next/link';

export function Navigation() {
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-4">
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
          </div>
        </div>
      </div>
    </nav>
  );
}
