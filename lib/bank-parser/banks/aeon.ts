import type { BankConfig } from '../types';

export const aeonConfig: BankConfig = {
  displayName: 'Aeon Bank',
  detectionPattern: /aeon|aeonbank/i,
  dateFormat: 'DD/MM/YYYY',
  // Groups: [1]=date (DD/MM/YYYY), [2]=description, [3]=withdrawal (optional), [4]=deposit (optional)
  linePattern: /^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})?$/,
};
