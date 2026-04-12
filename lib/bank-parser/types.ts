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
  /** Date format string: 'DD/MM/YY', 'DD Mon YY', or 'DD/MM/YYYY' */
  dateFormat: string;
  /**
   * Regex that matches a transaction line.
   * Signed format (Maybank):  [1]=date, [2]=description, [3]=signed amount e.g. "110.00+"
   * Separate format (AEON):  [1]=date, [2]=description, [3]=withdrawal, [4]=deposit, [5]=balance
   */
  linePattern: RegExp;
  /** 'signed' = amount has +/- suffix; 'separate' = debit/credit in separate columns; 'aeon_manual' = AEON's RM-prefixed amounts parsed by position */
  amountFormat: 'signed' | 'separate' | 'aeon_manual';
}
