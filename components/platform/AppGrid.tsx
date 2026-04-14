'use client';

import Link from 'next/link';
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