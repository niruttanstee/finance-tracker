# Bank Statement PDF Import — Design Spec

## Overview

Allow users without Wise API access (Maybank, Aeon, etc. users) to import transactions by uploading their monthly bank statement PDF. The existing Wise sync remains for users with API tokens. New users get a file upload flow instead.

---

## Architecture

### File Structure

```
app/
  api/
    import/
      route.ts              ← POST — accepts PDF, detects bank, parses, upserts
    sync/
      route.ts              ← POST — unchanged (Wise sync)
    settings/
      route.ts              ← GET/PATCH for settings
  page.tsx                  ← Homepage with dynamic sync/upload button
  settings/
      page.tsx              ← Settings page with tab navigation
  components/
    SyncButton.tsx          ← Dynamic: Wise sync OR PDF upload button
lib/
  bank-parser/
    index.ts                ← parseBankStatement(buffer) → Transaction[]
    banks/
      maybank.ts            ← detectionPattern, dateFormat, linePattern
      aeon.ts               ← detectionPattern, dateFormat, linePattern
      generic.ts            ← fallback detection + relaxed line regex
    types.ts                ← BankConfig, ParsedTransaction interfaces
  db.ts                     ← unchanged
  schema.ts                 ← unchanged (transactions table)
  wise.ts                   ← unchanged
```

### Settings — APIs Tab

**New `settings` table** (or extend existing):
```typescript
// lib/schema.ts — add to settings table
apiKey: text('api_key'),         // Wise API token (optional)
apiProvider: text('api_provider'), // 'wise' | null
```

**New Settings page tabs**:
- General (existing)
- **APIs** (new) — Wise token input field

**API tab fields**:
| Field | Type | Description |
|-------|------|-------------|
| Wise API Token | password input | Optional. If set, enables Wise sync. |

When Wise token is saved → homepage shows "Sync from Wise" button.
When no Wise token → homepage shows "Upload Statement" button.

---

## Components

### SyncButton (dynamic homepage button)

```tsx
// Reads from settings on mount (or from a lightweight API call)
const hasWiseToken = settings?.apiProvider === 'wise' && !!settings?.apiKey;

// If hasWiseToken → <SyncButton> (existing Wise sync behavior)
// Else → <UploadButton> (opens file picker)
```

States:
- `idle` — shows "Sync from Wise" or "Upload Statement"
- `loading` — shows spinner + "Syncing..." or "Importing..."
- `success` — shows "Done! X imported" for 3s then back to idle
- `error` — shows error message for 5s then back to idle

### Upload Modal / Inline

PDF upload uses native file picker:
- `<input type="file" accept=".pdf" />`
- On file select → immediate POST to `/api/import`
- No separate modal needed — success/error toast on the button itself

---

## API Endpoints

### POST /api/import

```
Content-Type: multipart/form-data
Body: { file: PDFFile }

Response 200:
{
  success: true,
  bank: 'maybank',          // or 'aeon' or 'generic'
  inserted: 12,
  updated: 3,
  total: 15
}

Response 400 (no file):
{ error: 'No file provided' }

Response 422 (no text extracted):
{ error: 'Could not extract text from PDF. Is it a scanned document?' }

Response 422 (unsupported + no generic match):
{ error: 'Unsupported bank format', supported: ['Maybank', 'Aeon'] }
```

### GET /api/settings
Returns: `{ wiseApiToken?: string, apiProvider?: string }`

### PATCH /api/settings
Body: `{ wiseApiToken?: string, apiProvider?: string }`
Updates settings in DB.

---

## Bank Parser

### Detection Flow

```
pdf-parse(buffer) → rawText
→ iterate BANK_CONFIGS = [maybank, aeon, generic]
  first detectionPattern.test(rawText) → use that bank config
  generic always matches (fallback)
→ for each line matching linePattern → parse fields
  skip if: amount is 0, or line is header/footer/totals
→ map to Transaction objects
```

### Maybank Config

```typescript
{
  detectionPattern: /maybank|m2u/i,
  dateFormat: 'DD-MM-YYYY',
  linePattern: /^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/,
  // Groups: date, description, debit, credit
  // Exactly one of debit/credit will be present
  displayName: 'Maybank'
}
```

### Aeon Config

```typescript
{
  detectionPattern: /aeon|aeonbank/i,
  dateFormat: 'DD/MM/YYYY',
  linePattern: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/,
  // Same groups, / separator in date
  displayName: 'Aeon Bank'
}
```

### Generic Config (fallback)

```typescript
{
  detectionPattern: /./,  // always matches
  dateFormat: 'DD/MM/YYYY',  // most common Asian bank format
  // More permissive — allows any amount in any column
  linePattern: /^(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(.+?)\s+([\d,]+\.\d{2})/,
  displayName: 'Generic'
}
```

### Adding a New Bank

1. Create `lib/bank-parser/banks/<bankname>.ts` with the config interface
2. Add to `BANK_CONFIGS` array in `index.ts` before generic

---

## Transaction Mapping

Parsed lines map to existing schema using **existing composite ID**:

```typescript
const compositeId = generateCompositeId(date, merchant, amount, 'MYR');
// generateCompositeId is already in app/api/sync/route.ts
// Move to lib/transactions.ts so it can be shared
```

The upsert logic in `/api/sync` is reused:
- Check existing by composite ID
- If exists → preserve category, update other fields
- If new → insert

---

## Deduplication

Composite ID strategy (`{unix_timestamp}_{merchant}_{amount}_{currency}`) handles:
- Duplicate transactions within the same PDF
- Duplicate transactions across multiple PDF imports
- Overlap between Wise sync and PDF import (same transaction from both sources)

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| PDF is a scanned image | pdf-parse returns empty text → 422 with helpful message |
| Bank not detected + generic fails | 422 with supported bank list |
| Bank detected but parsing fails | Partial import with summary of failures |
| No WISE_API_TOKEN in env or DB | Upload button shown |

---

## Adding pdf-parse Dependency

```bash
npm install pdf-parse
```

No native bindings required — works in Next.js server routes.
