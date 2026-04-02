import { createWiseClient } from './wise';

export async function getCurrentBalance(): Promise<{ balance: number; currency: string }> {
  // For server components, call Wise API directly instead of using HTTP API
  const client = createWiseClient();
  
  // Get personal profile
  const profiles = await client.getProfiles();
  let personalProfile = profiles.find(p => p.type?.toLowerCase() === 'personal');
  
  if (!personalProfile && profiles.length > 0) {
    personalProfile = profiles[0];
  }
  
  if (!personalProfile) {
    return { balance: 0, currency: 'MYR' };
  }

  // Get balances - filter for MYR only
  const balances = await client.getBalances(personalProfile.id);
  const myrBalance = balances.find(b => b.currency === 'MYR');
  
  if (!myrBalance) {
    return { balance: 0, currency: 'MYR' };
  }

  return {
    balance: Number(myrBalance.amount.value),
    currency: 'MYR',
  };
}
