import type { BankConfig } from '../types';

export const maybankConfig: BankConfig = {
  displayName: 'Maybank',
  detectionPattern: /maybank/i,
  dateFormat: 'DD/MM/YY',
  amountFormat: 'signed',
  // Groups: [1]=date (DD/MM/YY), [2]=description, [3]=signed amount e.g. "110.00+" or "125.00-"
  linePattern: /^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2}[+-])/,
};
