# Bank Statement Import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users without Wise API to import transactions via PDF bank statement upload. The homepage sync button dynamically shows Wise sync (if token configured) or PDF upload (otherwise).

**Architecture:** PDF upload → pdf-parse extracts text → auto-detect bank → regex parse transaction lines → map to existing Transaction schema → upsert via composite ID. Settings page gets an APIs tab to store Wise token in DB.

**Tech Stack:** pdf-parse, Next.js App Router, Drizzle ORM, SQLite, shadcn/ui tabs

---

## File Map

### New Files
- `lib/bank-parser/types.ts` — BankConfig, ParsedTransaction interfaces
- `lib/bank-parser/banks/maybank.ts` — Maybank detection + line regex config
- `lib/bank-parser/banks/aeon.ts` — Aeon detection + line regex config
- `lib/bank-parser/banks/generic.ts` — Fallback generic bank config
- `lib/bank-parser/index.ts` — parseBankStatement(buffer) → ParsedTransaction[]
- `app/api/import/route.ts` — POST endpoint: upload → parse → upsert
- `app/api/settings/route.ts` — GET/PATCH for API settings
- `app/components/settings/ApiSettings.tsx` — Wise token input form

### Modified Files
- `lib/schema.ts` — add `settings` table with `apiKey`, `apiProvider` columns
- `lib/db.ts:16-53` — add `CREATE TABLE IF NOT EXISTS settings` to `initDb()`
- `lib/transactions.ts` — export `generateCompositeId` (moved from sync route)
- `app/page.tsx:7,105` — fetch settings, pass `hasWiseToken` to SyncButton
- `app/components/SyncButton.tsx` — accept `mode: 'wise' | 'upload'`, render appropriate UI
- `app/settings/page.tsx` — import ApiSettings, add tabs (Categories | APIs)

### No changes to
- `app/api/sync/route.ts` — unchanged
- `lib/wise.ts` — unchanged

---

## Task 1: Add `settings` table to schema and db init

**Files:**
- Modify: `lib/schema.ts`
- Modify: `lib/db.ts:16-53`

- [ ] **Step 1a: Add settings table to schema**

Add to end of `lib/schema.ts`:

```typescript
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('app_settings'),
  apiProvider: text('api_provider'), // 'wise' | null
  apiKey: text('api_key'), // encrypted or plain Wise token
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
```

- [ ] **Step 1b: Add settings table to initDb()**

In `lib/db.ts`, add inside the `sqlite.exec()` block after the `category_budgets` CREATE TABLE:

```typescript
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY DEFAULT 'app_settings',
  api_provider TEXT,
  api_key TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

- [ ] **Step 1c: Commit**

```bash
git add lib/schema.ts lib/db.ts && git commit -m "feat: add settings table for API configuration

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Move generateCompositeId to lib/transactions.ts

**Files:**
- Modify: `lib/transactions.ts`
- Modify: `app/api/sync/route.ts:7-12`

- [ ] **Step 2a: Add generateCompositeId to lib/transactions.ts**

Add at end of `lib/transactions.ts`:

```typescript
export function generateCompositeId(date: Date, merchant: string, amount: number, currency: string): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  const sanitizedMerchant = merchant.replace(/[^a-zA-Z0-9]/g, '_');
  const amountStr = amount.toFixed(2).replace('.', '_');
  return `${timestamp}_${sanitizedMerchant}_${amountStr}_${currency}`;
}
```

- [ ] **Step 2b: Update sync route to import from lib/transactions.ts**

In `app/api/sync/route.ts`, remove the local `generateCompositeId` function (lines 7-12) and add import at top:

```typescript
import { generateCompositeId } from '@/lib/transactions';
```

- [ ] **Step 2c: Commit**

```bash
git add lib/transactions.ts app/api/sync/route.ts && git commit -m "refactor: move generateCompositeId to lib/transactions

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Install pdf-parse dependency

**Files:**
- None (dependency only)

- [ ] **Step 3a: Install pdf-parse**

```bash
npm install pdf-parse
```

- [ ] **Step 3b: Commit**

```bash
git add package.json package-lock.json && git commit -m "chore: add pdf-parse for bank statement import

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create bank parser — types and configs

**Files:**
- Create: `lib/bank-parser/types.ts`
- Create: `lib/bank-parser/banks/maybank.ts`
- Create: `lib/bank-parser/banks/aeon.ts`
- Create: `lib/bank-parser/banks/generic.ts`

- [ ] **Step 4a: Create lib/bank-parser/types.ts**

```typescript
export interface ParsedTransaction {
  date: Date;
  description: string;
  merchant: string;
  amount: number; // always positive, in MYR
  currency: string; // always 'MYR'
  originalAmount: number | null; // amount in source currency if not MYR
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
}

export interface BankConfig {
  /** Human-readable name for UI */
  displayName: string;
  /** Regex that matches against raw PDF text — must be unique per bank */
  detectionPattern: RegExp;
  /** Date format string: 'DD-MM-YYYY' or 'DD/MM/YYYY' */
  dateFormat: string;
  /**
   * Regex that matches a transaction line.
   * Must capture: [1]=date, [2]=description, [3]=debit (optional), [4]=credit (optional)
   * Amounts are positive numbers with optional comma separators, e.g. "1,234.56"
   */
  linePattern: RegExp;
}
```

- [ ] **Step 4b: Create lib/bank-parser/banks/maybank.ts**

```typescript
import type { BankConfig } from '../types';

export const maybankConfig: BankConfig = {
  displayName: 'Maybank',
  detectionPattern: /maybank|m2u/i,
  dateFormat: 'DD-MM-YYYY',
  // Groups: [1]=date (DD-MM-YYYY), [2]=description, [3]=debit amount (optional), [4]=credit amount (optional)
  // Amount format: "1,234.56" — commas optional, always positive in the column
  linePattern: /^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/,
};
```

- [ ] **Step 4c: Create lib/bank-parser/banks/aeon.ts**

```typescript
import type { BankConfig } from '../types';

export const aeonConfig: BankConfig = {
  displayName: 'Aeon Bank',
  detectionPattern: /aeon|aeonbank/i,
  dateFormat: 'DD/MM/YYYY',
  // Groups: [1]=date (DD/MM/YYYY), [2]=description, [3]=withdrawal (optional), [4]=deposit (optional)
  linePattern: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/,
};
```

- [ ] **Step 4d: Create lib/bank-parser/banks/generic.ts**

```typescript
import type { BankConfig } from '../types';

export const genericConfig: BankConfig = {
  displayName: 'Generic',
  detectionPattern: /./, // always matches — last resort
  dateFormat: 'DD/MM/YYYY', // most common Asian bank format
  // More permissive: accepts any amount in the debit column position
  // Groups: [1]=date, [2]=description, [3]=amount (debit/unspecified)
  linePattern: /^(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(.+?)\s+([\d,]+\.\d{2})/,
};
```

- [ ] **Step 4e: Commit**

```bash
git add lib/bank-parser/types.ts lib/bank-parser/banks/maybank.ts lib/bank-parser/banks/aeon.ts lib/bank-parser/banks/generic.ts && git commit -m "feat: add bank parser type definitions and bank configs

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Create bank parser core logic

**Files:**
- Create: `lib/bank-parser/index.ts`

- [ ] **Step 5a: Create lib/bank-parser/index.ts**

```typescript
import type { ParsedTransaction, BankConfig } from './types';
import { maybankConfig } from './banks/maybank';
import { aeonConfig } from './banks/aeon';
import { genericConfig } from './banks/generic';
import pdf from 'pdf-parse';

const BANK_CONFIGS: BankConfig[] = [maybankConfig, aeonConfig, genericConfig];

function parseDate(dateStr: string, format: string): Date {
  const normalized = dateStr.trim();
  if (format === 'DD-MM-YYYY') {
    const [day, month, year] = normalized.split('-').map(Number);
    return new Date(year, month - 1, day);
  } else {
    // DD/MM/YYYY
    const [day, month, year] = normalized.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
}

function extractMerchant(description: string): string {
  // Try to extract meaningful merchant name from description
  // Common patterns: "AUTO GIRO/IBG TFR - TRANSFER to MERCHANT_NAME"
  const match = description.match(/(?:to|from|transfer to|transfer from)\s+(.+?)(?:\s+on\s+|\s*$)/i);
  if (match) return match[1].trim();
  // Fallback: take first significant word
  const first = description.split(/\s+/).find(w => w.length > 2 && !/^(transfer|tfr|auto|giro|ibg|payment|purchase)/i.test(w));
  return first || description.slice(0, 30);
}

export interface ParseResult {
  bank: string;
  transactions: ParsedTransaction[];
}

export async function parseBankStatement(pdfBuffer: Buffer): Promise<ParseResult> {
  const data = await pdf(pdfBuffer);
  const rawText = data.text;

  // Detect bank
  let bankConfig = genericConfig;
  for (const config of BANK_CONFIGS) {
    if (config !== genericConfig && config.detectionPattern.test(rawText)) {
      bankConfig = config;
      break;
    }
  }

  const lines = rawText.split('\n');
  const transactions: ParsedTransaction[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(bankConfig.linePattern);
    if (!match) continue;

    const [, dateStr, description, debitStr, creditStr] = match;

    // Parse amount — exactly one of debit or credit should be present
    const debitAmount = debitStr ? parseFloat(debitStr.replace(/,/g, '')) : 0;
    const creditAmount = creditStr ? parseFloat(creditStr.replace(/,/g, '')) : 0;

    // Skip if both are zero or both are present (header/footer lines)
    if ((debitAmount === 0 && creditAmount === 0) || (debitAmount > 0 && creditAmount > 0)) {
      continue;
    }

    const amount = debitAmount > 0 ? debitAmount : creditAmount;
    const type: 'DEBIT' | 'CREDIT' = debitAmount > 0 ? 'DEBIT' : 'CREDIT';

    // Skip tiny amounts (likely rounding artifacts)
    if (amount < 0.01) continue;

    const date = parseDate(dateStr, bankConfig.dateFormat);
    const merchant = extractMerchant(description.trim());

    transactions.push({
      date,
      description: description.trim(),
      merchant,
      amount,
      currency: 'MYR',
      originalAmount: null,
      originalCurrency: null,
      exchangeRate: null,
      type,
    });
  }

  return {
    bank: bankConfig.displayName,
    transactions,
  };
}
```

- [ ] **Step 5b: Commit**

```bash
git add lib/bank-parser/index.ts && git commit -m "feat: add bank statement PDF parser core logic

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Create Settings API route

**Files:**
- Create: `app/api/settings/route.ts`

- [ ] **Step 6a: Create app/api/settings/route.ts**

```typescript
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { settings } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const result = await db.query.settings.findFirst({
      where: eq(settings.id, 'app_settings'),
    });
    return NextResponse.json({
      data: result || { id: 'app_settings', apiProvider: null, apiKey: null },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { apiProvider, apiKey } = await request.json();
    const now = new Date();

    await db
      .insert(settings)
      .values({ id: 'app_settings', apiProvider, apiKey, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: settings.id,
        set: { apiProvider, apiKey, updatedAt: now },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
```

- [ ] **Step 6b: Commit**

```bash
git add app/api/settings/route.ts && git commit -m "feat: add settings API route for API key management

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Create Import API route

**Files:**
- Create: `app/api/import/route.ts`

- [ ] **Step 7a: Create app/api/import/route.ts**

```typescript
import { NextResponse } from 'next/server';
import { parseBankStatement } from '@/lib/bank-parser';
import { generateCompositeId } from '@/lib/transactions';
import { db } from '@/lib/db';
import { transactions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse the PDF
    let parsed;
    try {
      parsed = await parseBankStatement(buffer);
    } catch (parseError) {
      console.error('PDF parse error:', parseError);
      return NextResponse.json(
        { error: 'Could not extract text from PDF. Is it a scanned document?' },
        { status: 422 }
      );
    }

    if (parsed.transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found in PDF. Unsupported bank format?', supported: ['Maybank', 'Aeon'] },
        { status: 422 }
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const tx of parsed.transactions) {
      const compositeId = generateCompositeId(tx.date, tx.merchant, tx.amount, tx.currency);

      const existing = await db.query.transactions.findFirst({
        where: eq(transactions.id, compositeId),
      });

      if (existing) {
        await db
          .update(transactions)
          .set({
            description: tx.description,
            merchant: tx.merchant,
            amount: tx.amount,
            currency: tx.currency,
            originalAmount: tx.originalAmount,
            originalCurrency: tx.originalCurrency,
            exchangeRate: tx.exchangeRate,
            type: tx.type,
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, compositeId));
        updated++;
      } else {
        await db.insert(transactions).values({
          id: compositeId,
          profileId: 0, // PDFs don't have profile IDs
          date: tx.date,
          description: tx.description,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          originalAmount: tx.originalAmount,
          originalCurrency: tx.originalCurrency,
          exchangeRate: tx.exchangeRate,
          type: tx.type,
          category: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      bank: parsed.bank,
      inserted,
      updated,
      total: parsed.transactions.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 7b: Commit**

```bash
git add app/api/import/route.ts && git commit -m "feat: add PDF import API route with bank auto-detection

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Create ApiSettings component

**Files:**
- Create: `app/components/settings/ApiSettings.tsx`

- [ ] **Step 8a: Create app/components/settings/ApiSettings.tsx**

```typescript
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
```

- [ ] **Step 8b: Commit**

```bash
git add app/components/settings/ApiSettings.tsx && git commit -m "feat: add API settings component for Wise token management

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Add tabs to Settings page

**Files:**
- Modify: `app/settings/page.tsx`

- [ ] **Step 9a: Update app/settings/page.tsx**

```typescript
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CategoryManager } from '../components/settings/CategoryManager';
import { ApiSettings } from '../components/settings/ApiSettings';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsPage() {
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

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="apis">APIs</TabsTrigger>
        </TabsList>

        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>

        <TabsContent value="apis">
          <ApiSettings />
        </TabsContent>
      </Tabs>
    </main>
  );
}
```

**Note:** If `Tabs` components don't exist, install them:
```bash
npx shadcn@latest add tabs
```

- [ ] **Step 9b: Commit**

```bash
git add app/settings/page.tsx && git commit -m "feat: add APIs tab to settings page

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Update SyncButton to be dynamic

**Files:**
- Modify: `app/components/SyncButton.tsx`

- [ ] **Step 10a: Update SyncButton to support both modes**

Replace the entire `SyncButton.tsx` with:

```typescript
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
```

- [ ] **Step 10b: Commit**

```bash
git add app/components/SyncButton.tsx && git commit -m "feat: make SyncButton dynamic — Wise or PDF upload mode

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 11: Update homepage to pass mode to SyncButton

**Files:**
- Modify: `app/page.tsx:1-52,105`

- [ ] **Step 11a: Update app/page.tsx to fetch settings and pass mode to SyncButton**

Add `useEffect` to fetch settings and state for `hasWiseToken`:

Add after line 27 (after `const [categories, setCategories]`):

```typescript
const [hasWiseToken, setHasWiseToken] = useState(false);
```

Add inside `fetchData` after the Promise.all call:

```typescript
const settingsResponse = await fetch('/api/settings');
const settingsData = await settingsResponse.json();
setHasWiseToken(settingsData.data?.apiProvider === 'wise' && !!settingsData.data?.apiKey);
```

Add to the dependency array of `useEffect`:

```typescript
}, [fetchData]);
```

Change the SyncButton usage on line 105 from:

```tsx
<SyncButton onSync={fetchData} />
```

to:

```tsx
<SyncButton mode={hasWiseToken ? 'wise' : 'upload'} onSync={fetchData} />
```

- [ ] **Step 11b: Commit**

```bash
git add app/page.tsx && git commit -m "feat: homepage fetches settings to determine sync/upload mode

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 12: Manual verification

Before marking complete, verify:

1. **PDF import works** — Upload Maybank PDF, check transactions appear in `/transactions` with correct amounts
2. **Deduplication works** — Upload same PDF twice, second upload should report 0 new inserted
3. **Bank detection works** — Upload Aeon PDF, check bank name in success message
4. **Wise still works** — With token set, sync button says "Sync with Wise"
5. **Upload button shown when no token** — With token cleared, sync button says "Upload Statement"
6. **Settings persist** — Refresh settings page, Wise token still shown
