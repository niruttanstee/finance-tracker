'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface SyncButtonProps {
  mode: 'wise' | 'upload';
  onSync?: () => void;
}

export function SyncButton({ mode, onSync }: SyncButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const router = useRouter();

  async function handleWiseSync() {
    setIsActive(true);

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (response.ok) {
        setLastSync(new Date());
        onSync?.();
        toast.success(
          `Synced successfully: ${data.inserted ?? 0} new, ${data.updated ?? 0} updated`
        );
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch {
      toast.error('Network error. Please try again.');
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

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/import', { method: 'POST', body: formData });
        const data = await response.json();

        if (response.ok) {
          setLastSync(new Date());
          router.refresh();
          onSync?.();
          toast.success(
            `${data.bank}: ${data.total} transactions (${data.inserted} new, ${data.updated} updated)`
          );
        } else {
          toast.error(data.error || 'Import failed');
        }
      } catch {
        toast.error('Network error. Please try again.');
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
          <Upload className="mr-2 h-4 w-4" />
          {isActive ? 'Importing...' : 'Upload Statement'}
        </Button>
      )}

      {lastSync && (
        <p className="text-sm text-muted-foreground text-center">
          {mode === 'wise' ? 'Last synced: ' : 'Last import: '}
          {lastSync.toLocaleString()}
        </p>
      )}
    </div>
  );
}
