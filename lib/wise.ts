const WISE_API_BASE = 'https://api.wise.com';

export interface WiseActivity {
  id: string;
  type: string;
  resource: {
    type: string;
    id: number;
  };
  title: string;
  description: string;
  primaryAmount: number;
  primaryCurrency: string;
  secondaryAmount: number;
  secondaryCurrency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface WiseProfile {
  id: number;
  type: 'personal' | 'business';
  details: {
    firstName?: string;
    lastName?: string;
    name?: string;
  };
}

export interface WiseStatementTransaction {
  transactionId: string;
  type: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  runningBalance: number;
  merchant?: string;
}

export class WiseClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${WISE_API_BASE}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Wise API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  async getProfiles(): Promise<WiseProfile[]> {
    return this.fetch<WiseProfile[]>('/v2/profiles');
  }

  async getBalances(profileId: number): Promise<Array<{ id: number; currency: string; amount: number }>> {
    return this.fetch<Array<{ id: number; currency: string; amount: number }>>(`/v4/profiles/${profileId}/balances?types=STANDARD`);
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }
    
    const response = await this.fetch<{
      rate: number;
    }>(`/v1/rates?source=${fromCurrency}&target=${toCurrency}`);
    
    return response.rate;
  }

  async getBalanceStatement(
    profileId: number,
    balanceId: number,
    since?: Date,
    until?: Date
  ): Promise<WiseStatementTransaction[]> {
    const params = new URLSearchParams();
    if (since) params.append('intervalStart', since.toISOString());
    if (until) params.append('intervalEnd', until.toISOString());

    const response = await this.fetch<{
      transactions: Array<{
        transactionId: string;
        type: string;
        date: string;
        description: string;
        amount: { value: number; currency: string };
        runningBalance: { value: number; currency: string };
        details?: {
          type?: string;
          description?: string;
          merchant?: {
            name?: string;
          };
        };
      }>;
    }>(`/v1/profiles/${profileId}/balance-statements/${balanceId}/statement.json?${params.toString()}`);

    return response.transactions.map(t => ({
      transactionId: t.transactionId,
      type: t.type,
      date: t.date,
      description: t.description || t.details?.description || '',
      amount: t.amount.value,
      currency: t.amount.currency,
      runningBalance: t.runningBalance.value,
      merchant: t.details?.merchant?.name,
    }));
  }
}

export function createWiseClient(): WiseClient {
  const token = process.env.WISE_API_TOKEN;
  if (!token) {
    throw new Error('WISE_API_TOKEN not configured');
  }
  return new WiseClient(token);
}
