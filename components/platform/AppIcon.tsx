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