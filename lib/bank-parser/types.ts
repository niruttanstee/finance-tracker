export interface ParsedTransaction {
  date: Date;
  description: string;
  merchant: string;
  amount: number; // always positive, in MYR
  currency: string; // always 'MYR'
  originalAmount: number | null;
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
