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
