'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload, FileText } from 'lucide-react';

interface SyncResult {
  success: boolean;
  inserted?: number;
  updated?: number;
  total?: number;
  bank?: string;
  error?: string;
}

interface SyncButtonProps {
  mode: 'wise' | 'upload';
  onSync?: () => void;
}

export function SyncButton({ mode, onSync }: SyncButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const router = useRouter();

  async function handleWiseSync() {
    setIsActive(true);
    setResult(null);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, inserted: data.inserted, updated: data.updated, total: data.unique });
        setLastSync(new Date());
        router.refresh();
        onSync?.();
      } else {
        setResult({ success: false, error: data.error || 'Sync failed' });
      }
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setIsActive(false);
    }
  }

  async function handleFileUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsActive(true);
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/import', { method: 'POST', body: formData });
        const data = await response.json();

        if (response.ok) {
          setResult({
            success: true,
            inserted: data.inserted,
            updated: data.updated,
            total: data.total,
            bank: data.bank,
          });
          setLastSync(new Date());
          router.refresh();
          onSync?.();
        } else {
          setResult({ success: false, error: data.error || 'Import failed' });
        }
      } catch {
        setResult({ success: false, error: 'Network error. Please try again.' });
      } finally {
        setIsActive(false);
      }
    };
    input.click();
  }

  return (
    <div className="space-y-2">
      {mode === 'wise' ? (
        <Button onClick={handleWiseSync} disabled={isActive} className="w-full">
          <RefreshCw className={`mr-2 h-4 w-4 ${isActive ? 'animate-spin' : ''}`} />
          {isActive ? 'Syncing...' : 'Sync with Wise'}
        </Button>
      ) : (
        <Button onClick={handleFileUpload} disabled={isActive} className="w-full">
          <Upload className={`mr-2 h-4 w-4 ${isActive ? 'animate-spin' : ''}`} />
          {isActive ? 'Importing...' : 'Upload Statement'}
        </Button>
      )}

      {lastSync && (
        <p className="text-sm text-muted-foreground text-center">
          {mode === 'wise' ? 'Last synced: ' : 'Last import: '}{lastSync.toLocaleString()}
        </p>
      )}

      {result && (
        <div className={`text-sm text-center p-2 rounded ${
          result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {result.success ? (
            <>
              <FileText className="inline mr-1 h-4 w-4" />
              {result.bank ? `${result.bank}: ` : ''}
              {result.total} transaction{result.total !== 1 ? 's' : ''}
              {result.inserted ? ` (${result.inserted} new)` : ''}
              {result.updated ? ` (${result.updated} updated)` : ''}
            </>
          ) : (
            <>❌ {result.error}</>
          )}
        </div>
      )}
    </div>
  );
}
