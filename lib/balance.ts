import { createWiseClient } from './wise';
import { db } from './db';
import { settings } from './schema';
import { and, eq } from 'drizzle-orm';

export async function getCurrentBalance(userId?: string): Promise<{ balance: number; currency: string }> {
  try {
    let token: string | undefined;

    if (userId) {
      const userSettings = await db.query.settings.findFirst({
        where: and(eq(settings.id, 'app_settings'), eq(settings.userId, userId)),
      });
      token = userSettings?.apiKey;
    }

    const client = createWiseClient(token);
    if (!client) {
      return { balance: 0, currency: 'MYR' };
    }

    const profiles = await client.getProfiles();
    let personalProfile = profiles.find(p => p.type?.toLowerCase() === 'personal');

    if (!personalProfile && profiles.length > 0) {
      personalProfile = profiles[0];
    }

    if (!personalProfile) {
      return { balance: 0, currency: 'MYR' };
    }

    const balances = await client.getBalances(personalProfile.id);
    const myrBalance = balances.find(b => b.currency === 'MYR');

    if (!myrBalance) {
      return { balance: 0, currency: 'MYR' };
    }

    return {
      balance: Number(myrBalance.amount.value),
      currency: 'MYR',
    };
  } catch (error) {
    console.error('Failed to get balance from Wise:', error);
    return { balance: 0, currency: 'MYR' };
  }
}