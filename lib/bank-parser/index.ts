import type { ParsedTransaction, BankConfig } from './types';
import { maybankConfig } from './banks/maybank';
import { aeonConfig } from './banks/aeon';
import { genericConfig } from './banks/generic';
import { PDFParse } from 'pdf-parse';

const BANK_CONFIGS: BankConfig[] = [maybankConfig, aeonConfig, genericConfig];

function parseDate(dateStr: string, format: string): Date {
  const normalized = dateStr.trim();
  if (format === 'DD/MM/YY') {
    const [day, month, year] = normalized.split('/').map(Number);
    const d = new Date(2000 + year, month - 1, day);
    d.setHours(12, 0, 0, 0); // avoid UTC midnight rollover
    return d;
  } else if (format === 'DD Mon YY') {
    const parts = normalized.split(' ');
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1];
    const year = parseInt(parts[2], 10);
    const monthIdx = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(monthStr);
    const d = new Date(2000 + year, monthIdx, day);
    d.setHours(12, 0, 0, 0); // avoid UTC midnight rollover
    return d;
  } else {
    // DD/MM/YYYY
    const [day, month, year] = normalized.split('/').map(Number);
    const d = new Date(year, month - 1, day);
    d.setHours(12, 0, 0, 0);
    return d;
  }
}

function extractMerchant(description: string): string {
  // Skip known transaction type prefixes first
  const skipPrefix = /^(SALE\s*DEBIT|SALE\s*CREDIT|FUND\s*TRANSFER|TRANSFER\s*(FROM|TO)|IBK\s*FUND|BOOK\s*TRANSFER|FPX\s*PAYMENT|PYMT\s*(FROM|TO)|SVG\s*GIRO|DR\s*BUY|ESS\s*CLAIM)/i;
  const desc = description.replace(skipPrefix, '').trim();

  // Maybank format: "TYPE | MERCHANT * | CITY | TYPE" — merchant is between | and *
  // The * marks the merchant name, so look for pattern: "| MERCHANT *"
  const merchantStarMatch = desc.match(/\|\s*([A-Za-z][A-Za-z\s&.\-]{1,30})\s*\*/);
  if (merchantStarMatch) return merchantStarMatch[1].trim();

  // Transfer patterns: "TRANSFER TO A/ RECIPIENT NAME" or "FUND TRANSFER FROM A/ SENDER NAME"
  const transferMatch = desc.match(/(?:transfer\s+)?(?:from|to)\s+[A]\/\s+([A-Z][A-Z\s]{2,})/i);
  if (transferMatch) return transferMatch[1].trim();

  // Look for merchant-like patterns: words with hyphens (e.g. UNIQLO-SETIA, GRABPAY-EC)
  // or proper capitalized names
  const capitalized = description.match(/\b([A-Z][a-zA-Z]{2,}(?:-[A-Za-z]+)*)\b/g);
  if (capitalized && capitalized.length > 0) {
    const stopwords = /^(Transfer|From|To|Fund|Payment|Sale|Debit|Credit|Giro|Fpx|Ibk|Ess|Dr|Svg|Cr|DuitNow|Fee|Profit|Claim|Book|Transfer|Mbb|Duit|Sdn|Bhd)$/i;
    const candidates = capitalized.filter(w => !stopwords.test(w) && w.length > 3);
    if (candidates.length > 0) return candidates[0];
  }

  // Fallback: first significant word
  const words = desc.split(/\s+/);
  for (const w of words) {
    if (w.length <= 3) continue;
    if (/^(transfer|tfr|auto|giro|ibg|payment|purchase|sale|debit|credit|fund|book|ess|dr|svg|cr|duitnow|fee|profit|claim|from|to)$/i.test(w)) continue;
    if (/[a-zA-Z]{3}/.test(w)) return w;
  }
  return desc.slice(0, 30);
}

export interface ParseResult {
  bank: string;
  transactions: ParsedTransaction[];
}

export async function parseBankStatement(pdfBuffer: Buffer): Promise<ParseResult> {
  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  const rawText = textResult.text;

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
  const skipLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (skipLines.has(i)) continue;

    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const match = trimmed.match(bankConfig.linePattern);
    if (!match) continue;

    let amount: number;
    let type: 'DEBIT' | 'CREDIT';

    if (bankConfig.amountFormat === 'signed') {
      const dateStr = match[1];
      let description = match[2].trim();

      // Look at next line(s) for additional description (merchant name, location, etc.)
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) break;
        // Stop if next line is a new transaction or header/footer
        if (/^\d{2}[\/\-]/.test(nextLine)) break;
        if (nextLine.match(bankConfig.linePattern)) break;
        if (/^(ENTRY DATE|BEGINNING BALANCE|ENDING BALANCE|TOTAL|CREDIT|DEBIT|URUSNIAGA|PROTECTED|Baki|Maybank|AEON)/i.test(nextLine)) break;
        // This looks like a continuation — append it and skip
        description = description + ' | ' + nextLine;
        skipLines.add(j);
      }

      // Clean up trailing transaction type labels that appear as standalone continuation lines
      description = description
        .replace(/\|\s*(SALE\s*DEBIT|SALE\s*CREDIT|TRANSFER\s*(FROM|TO)|PAYMENT\s*(FROM|TO)|FUND\s*TRANSFER)\s*$/gi, '')
        .trim();

      const signedAmount = match[3];
      type = signedAmount.endsWith('-') ? 'DEBIT' : 'CREDIT';
      amount = parseFloat(signedAmount.replace(/[,+-]/g, ''));

      if (amount < 0.01) continue;

      const date = parseDate(dateStr, bankConfig.dateFormat);
      const merchant = extractMerchant(description);

      transactions.push({
        date,
        description,
        merchant,
        amount,
        currency: 'MYR',
        originalAmount: null,
        originalCurrency: null,
        exchangeRate: null,
        type,
      });
    } else if (bankConfig.amountFormat === 'aeon_manual') {
      const dateRe = /^(\d{2} \w{3} \d{2})/;
      const dateMatch = trimmed.match(dateRe);
      if (!dateMatch) continue;
      const dateStr = dateMatch[1];
      const dateEnd = dateMatch[0].length;

      const amountRe = /(-RM\s*[\d,]+\.\d{2}|RM\s*[\d,]+\.\d{2})/g;
      const amounts: { text: string; idx: number }[] = [];
      let am: RegExpExecArray | null;
      while ((am = amountRe.exec(trimmed)) !== null) {
        amounts.push({ text: am[0], idx: am.index });
      }

      if (amounts.length < 2) continue;

      const isWithdrawal = amounts[0].text.startsWith('-RM');
      const isDeposit = amounts[0].text.startsWith('RM') && !amounts[0].text.startsWith('-RM');

      if (!isWithdrawal && !isDeposit) continue;

      amount = parseFloat(amounts[0].text.replace(/[^0-9.]/g, ''));
      type = isWithdrawal ? 'DEBIT' : 'CREDIT';

      if (amount < 0.01) continue;

      // Description is between date and the first amount
      let description = trimmed.slice(dateEnd, amounts[0].idx).trim();
      // Look at next line for continuation
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) break;
        if (/^\d{2} \w{3} \d{2}/.test(nextLine)) break;
        if (/^(Page \d+ of|eStatement|Important|AEON|Account|Protected)/i.test(nextLine)) break;
        description = description + ' | ' + nextLine;
        skipLines.add(j);
      }

      const date = parseDate(dateStr, bankConfig.dateFormat);
      const merchant = extractMerchant(description);

      transactions.push({
        date,
        description,
        merchant,
        amount,
        currency: 'MYR',
        originalAmount: null,
        originalCurrency: null,
        exchangeRate: null,
        type,
      });
    } else {
      // separate format (not used currently)
      const withdrawal = match[3];
      const deposit = match[4];
      const isWithdrawal = withdrawal.startsWith('-RM') && !withdrawal.startsWith('-RM 0.00');
      const isDeposit = deposit.startsWith('RM') && !deposit.startsWith('RM 0.00');
      if (isWithdrawal) {
        type = 'DEBIT';
        amount = parseFloat(withdrawal.replace(/[^0-9.]/g, ''));
      } else if (isDeposit) {
        type = 'CREDIT';
        amount = parseFloat(deposit.replace(/[^0-9.]/g, ''));
      } else {
        continue; // RM 0.00 in both = no transaction
      }

      if (amount < 0.01) continue;

      const date = parseDate(match[1], bankConfig.dateFormat);
      const merchant = extractMerchant(match[2].trim());

      transactions.push({
        date,
        description: match[2].trim(),
        merchant,
        amount,
        currency: 'MYR',
        originalAmount: null,
        originalCurrency: null,
        exchangeRate: null,
        type,
      });
    }
  }

  return {
    bank: bankConfig.displayName,
    transactions,
  };
}
