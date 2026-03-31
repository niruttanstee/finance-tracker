'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SyncResult {
  success: boolean;
  inserted?: number;
  updated?: number;
  error?: string;
}

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setResult(null);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          inserted: data.inserted,
          updated: data.updated,
        });
        setLastSync(new Date());
      } else {
        setResult({
          success: false,
          error: data.error || 'Sync failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error. Please try again.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleSync}
        disabled={isSyncing}
        className="w-full"
      >
        <RefreshCw
          className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`}
        />
        {isSyncing ? 'Syncing...' : 'Sync with Wise'}
      </Button>

      {lastSync && (
        <p className="text-sm text-muted-foreground text-center">
          Last synced: {lastSync.toLocaleString()}
        </p>
      )}

      {result && (
        <div
          className={`text-sm text-center p-2 rounded ${
            result.success
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {result.success ? (
            <>
              ✅ Synced successfully!
              {result.inserted ? ` ${result.inserted} new` : ''}
              {result.updated ? ` ${result.updated} updated` : ''}
            </>
          ) : (
            <>❌ {result.error}</>
          )}
        </div>
      )}
    </div>
  );
}
