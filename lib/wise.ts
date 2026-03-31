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

  async getActivities(
    profileId: number,
    since?: Date,
    until?: Date
  ): Promise<WiseActivity[]> {
    const params = new URLSearchParams();
    if (since) params.append('since', since.toISOString());
    if (until) params.append('until', until.toISOString());
    params.append('size', '100');

    return this.fetch<WiseActivity[]>(
      `/v3/profiles/${profileId}/activities?${params.toString()}`
    );
  }
}

export function createWiseClient(): WiseClient {
  const token = process.env.WISE_API_TOKEN;
  if (!token) {
    throw new Error('WISE_API_TOKEN not configured');
  }
  return new WiseClient(token);
}
