import { NextResponse } from 'next/server';
import { createWiseClient } from '@/lib/wise';
import { db } from '@/lib/db';
import { transactions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

function extractMerchant(description: string): string {
  // Try to extract merchant name from Wise description
  // Format is usually: "CARD_TRANSACTION from MERCHANT_NAME"
  const match = description.match(/from\s+(.+?)(?:\s+on\s+|\s*$)/i);
  return match ? match[1].trim() : description;
}

function parseStatementTransaction(
  transaction: {
    transactionId: string;
    type: string;
    date: string;
    description: string;
    amount: number;
    currency: string;
  },
  profileId: number
): {
  id: string;
  profileId: number;
  date: Date;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  type: 'DEBIT' | 'CREDIT';
  createdAt: Date;
  updatedAt: Date;
} {
  const isDebit = transaction.amount < 0;
  
  return {
    id: transaction.transactionId,
    profileId: profileId,
    date: new Date(transaction.date),
    description: transaction.description,
    merchant: extractMerchant(transaction.description),
    amount: Math.abs(transaction.amount),
    currency: transaction.currency,
    type: isDebit ? 'DEBIT' : 'CREDIT',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function POST() {
  try {
    const client = createWiseClient();
    
    // Get personal profile
    const profiles = await client.getProfiles();
    console.log('Profiles returned:', JSON.stringify(profiles, null, 2));
    
    // Try to find personal profile, fallback to any profile
    let personalProfile = profiles.find(p => p.type?.toLowerCase() === 'personal');
    
    if (!personalProfile && profiles.length > 0) {
      // Use first available profile if no personal one found
      personalProfile = profiles[0];
      console.log('Using first available profile:', personalProfile.id);
    }
    
    if (!personalProfile) {
      return NextResponse.json(
        { error: 'No profile found. Check your API token has correct permissions.' },
        { status: 404 }
      );
    }

    // Get balances for the profile
    const balances = await client.getBalances(personalProfile.id);
    console.log('Balances found:', balances.length);

    if (balances.length === 0) {
      return NextResponse.json(
        { error: 'No balances found for this profile' },
        { status: 404 }
      );
    }

    // Get transactions from last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let allTransactions: Array<{
      id: string;
      profileId: number;
      date: Date;
      description: string;
      merchant: string;
      amount: number;
      currency: string;
      type: 'DEBIT' | 'CREDIT';
      createdAt: Date;
      updatedAt: Date;
    }> = [];

    // Fetch statements for each balance
    for (const balance of balances) {
      try {
        const statementTransactions = await client.getBalanceStatement(
          personalProfile.id,
          balance.id,
          oneYearAgo,
          new Date()
        );
        
        const parsed = statementTransactions.map(t => 
          parseStatementTransaction(t, personalProfile.id)
        );
        allTransactions = allTransactions.concat(parsed);
      } catch (error) {
        console.error(`Error fetching statement for balance ${balance.id}:`, error);
      }
    }

    let inserted = 0;
    let updated = 0;

    for (const transaction of allTransactions) {
      // Check if transaction exists
      const existing = await db.query.transactions.findFirst({
        where: eq(transactions.id, transaction.id),
      });

      if (existing) {
        await db.update(transactions)
          .set({
            ...transaction,
            category: existing.category, // Preserve existing category
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, transaction.id));
        updated++;
      } else {
        await db.insert(transactions).values(transaction);
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      total: allTransactions.length,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
