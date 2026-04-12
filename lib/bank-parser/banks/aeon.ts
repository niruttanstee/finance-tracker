import type { BankConfig } from '../types';

export const aeonConfig: BankConfig = {
  displayName: 'Aeon Bank',
  detectionPattern: /aeon|aeonbank/i,
  dateFormat: 'DD Mon YY',
  amountFormat: 'aeon_manual',
  // Line pattern is a fallback - actual parsing uses manual extraction since
  // descriptions can contain "RM" characters that confuse regex
  linePattern: /^(\d{2} \w{3} \d{2})/,
};
