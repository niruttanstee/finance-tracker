// app/page.tsx — Launcher homepage
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-xl mx-auto">
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
