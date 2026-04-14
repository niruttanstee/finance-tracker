'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CategoryManager } from '@/app/components/settings/CategoryManager';
import { ApiSettings } from '@/app/components/settings/ApiSettings';
import { ArrowLeft, Key, Tags } from 'lucide-react';
import { cn } from '@/lib/utils';

type SettingsSection = 'categories' | 'apis';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('categories');

  const navItems = [
    { id: 'categories' as const, label: 'Categories', icon: Tags },
    { id: 'apis' as const, label: 'APIs', icon: Key },
  ];

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your application preferences
        </p>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar Navigation */}
        <div className="w-56 shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors',
                    activeSection === item.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {activeSection === 'categories' && <CategoryManager />}
          {activeSection === 'apis' && <ApiSettings />}
        </div>
      </div>
    </main>
  );
}
