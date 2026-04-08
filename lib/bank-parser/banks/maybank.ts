import type { BankConfig } from '../types';

export const maybankConfig: BankConfig = {
  displayName: 'Maybank',
  detectionPattern: /maybank|m2u/i,
  dateFormat: 'DD-MM-YYYY',
  // Groups: [1]=date (DD-MM-YYYY), [2]=description, [3]=debit amount (optional), [4]=credit amount (optional)
  // Amount format: "1,234.56" — commas optional, always positive in the column
  linePattern: /^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/,
};
