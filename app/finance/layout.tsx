'use client';

import { useRouter } from 'next/navigation';

interface FinanceLayoutProps {
  children: React.ReactNode;
}

export default function FinanceLayout({ children }: FinanceLayoutProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen">
      {/* App Header with Back Button */}
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
