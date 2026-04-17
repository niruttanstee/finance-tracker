// app/page.tsx — Launcher homepage
'use client';

import { useEffect, useState, useCallback } from 'react';
import { platformApps } from '@/lib/platform/apps';
import { FinanceIconWrapper } from '@/components/platform/icons/FinanceIconWrapper';

const iconComponents: Record<string, React.ReactNode> = {
  finance: <FinanceIconWrapper />,
};

async function login(username: string, password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export default function LauncherPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const showLogin = useCallback(() => {
    const username = window.prompt('Username:');
    if (!username) return;
    const password = window.prompt('Password:');
    if (!password) return;

    setLoading(true);
    login(username, password).then(success => {
      if (success) {
        setAuthenticated(true);
        window.location.reload();
      } else {
        window.alert('Invalid credentials');
        showLogin();
      }
    });
  }, []);

  useEffect(() => {
    // Check if already authenticated via cookie
    fetch('/api/auth/me')
      .then(res => res.ok ? setAuthenticated(true) : showLogin())
      .catch(() => showLogin())
      .finally(() => setLoading(false));
  }, [showLogin]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p>Please log in</p>
      </main>
    );
  }

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
