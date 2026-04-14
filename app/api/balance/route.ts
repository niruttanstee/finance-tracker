import { NextResponse } from 'next/server';
import { createWiseClient } from '@/lib/wise';

export async function GET() {
  try {
    const client = createWiseClient();
    if (!client) {
      return NextResponse.json({
        balance: 0,
        currency: 'MYR',
        error: 'Wise API not configured'
      }, { status: 400 });
    }

    // Get personal profile
    const profiles = await client.getProfiles();
    let personalProfile = profiles.find(p => p.type?.toLowerCase() === 'personal');
    
    if (!personalProfile && profiles.length > 0) {
      personalProfile = profiles[0];
    }
    
    if (!personalProfile) {
      return NextResponse.json({
        balance: 0,
        currency: 'MYR',
        error: 'No profile found'
      }, { status: 404 });
    }

    // Get balances - filter for MYR only
    const balances = await client.getBalances(personalProfile.id);
    const myrBalance = balances.find(b => b.currency === 'MYR');
    
    if (!myrBalance) {
      return NextResponse.json({
        balance: 0,
        currency: 'MYR',
        message: 'No MYR balance found'
      });
    }

    return NextResponse.json({
      balance: Number(myrBalance.amount.value),
      currency: 'MYR',
    });
  } catch (error) {
    console.error('Balance fetch error:', error);
    return NextResponse.json({
      balance: 0,
      currency: 'MYR',
      error: error instanceof Error ? error.message : 'Failed to fetch balance'
    }, { status: 500 });
  }
}
