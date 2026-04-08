import type { BankConfig } from '../types';

export const genericConfig: BankConfig = {
  displayName: 'Generic',
  detectionPattern: /./, // always matches — last resort
  dateFormat: 'DD/MM/YYYY', // most common Asian bank format
  // More permissive: accepts any amount in the debit column position
  // Groups: [1]=date, [2]=description, [3]=amount (debit/unspecified)
  linePattern: /^(\d{2}[\/\-]\d{2}[\/\-]\d{4})\s+(.+?)\s+([\d,]+\.\d{2})/,
};
