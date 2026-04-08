'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Key, Eye, EyeOff } from 'lucide-react';

interface ApiSettings {
  apiProvider?: string;
  apiKey?: string;
}

export function ApiSettings() {
  const [settings, setSettings] = useState<ApiSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setSettings(data.data || {});
        setToken(data.data?.apiKey || '');
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiProvider: token ? 'wise' : null, apiKey: token || null }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'API settings saved.' });
        setSettings({ apiProvider: token ? 'wise' : null, apiKey: token || null });
      } else {
        setMessage({ type: 'error', text: 'Failed to save settings.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>API Configuration</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Loading...</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your bank account via API for automatic transaction syncing.
          If no API is configured, you can upload bank statement PDFs manually.
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium">Wise API Token</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Paste your Wise API token here"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your token from{' '}
            <a href="https://wise.com" target="_blank" rel="noopener noreferrer" className="underline">
              wise.com
            </a>
            . If left empty, use PDF upload instead.
          </p>
        </div>
        {message && (
          <div className={`text-sm p-2 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
