import { NextResponse } from 'next/server';
import { createWiseClient } from '@/lib/wise';
import { db } from '@/lib/db';
import { transactions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

function generateCompositeId(date: Date, merchant: string, amount: number, currency: string): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  const sanitizedMerchant = merchant.replace(/[^a-zA-Z0-9]/g, '_');
  const amountStr = amount.toFixed(2).replace('.', '_');
  return `${timestamp}_${sanitizedMerchant}_${amountStr}_${currency}`;
}

function extractMerchant(description: string | null | undefined, typeLabel: string): string {
  // Try to extract merchant name from Wise description
  // Format is usually: "CARD_TRANSACTION from MERCHANT_NAME"
  if (!description) return typeLabel;
  const match = description.match(/from\s+(.+?)(?:\s+on\s+|\s*$)/i);
  return match ? match[1].trim() : typeLabel;
}

async function convertToMYR(
  client: ReturnType<typeof createWiseClient>,
  amount: number,
  fromCurrency: string
): Promise<{ myrAmount: number; rate: number }> {
  if (fromCurrency === 'MYR') {
    return { myrAmount: amount, rate: 1 };
  }
  
  const rate = await client.getExchangeRate(fromCurrency, 'MYR');
  return { myrAmount: amount * rate, rate };
}

async function parseStatementTransaction(
  client: ReturnType<typeof createWiseClient>,
  transaction: {
    transactionId: string;
    type: string;
    date: string;
    description: string | null | undefined;
    amount: number;
    currency: string;
    merchant?: string | null;
  },
  profileId: number
): Promise<{
  id: string;
  wiseId: string;
  profileId: number;
  date: Date;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
  createdAt: Date;
  updatedAt: Date;
}> {
  const isDebit = transaction.amount < 0;
  // Use transaction type as fallback, format it nicely (e.g., "CARD_TRANSACTION" -> "Card Transaction")
  const typeLabel = transaction.type
    ?.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase()) || 'Transaction';
  const description = transaction.description || typeLabel;
  const merchant = transaction.merchant || extractMerchant(description, typeLabel);
  const date = new Date(transaction.date);
  const absAmount = Math.abs(transaction.amount);
  const sourceCurrency = transaction.currency;
  
  // Convert to MYR
  const { myrAmount, rate } = await convertToMYR(client, absAmount, sourceCurrency);
  
  // Generate composite ID from transaction content instead of using Wise transactionId
  // This prevents duplicates when the same transaction appears in multiple balance statements
  const compositeId = generateCompositeId(date, merchant, myrAmount, 'MYR');
  
  return {
    id: compositeId,
    wiseId: transaction.transactionId,
    profileId: profileId,
    date: date,
    description: description,
    merchant: merchant,
    amount: myrAmount,
    currency: 'MYR',
    originalAmount: sourceCurrency === 'MYR' ? null : absAmount,
    originalCurrency: sourceCurrency === 'MYR' ? null : sourceCurrency,
    exchangeRate: sourceCurrency === 'MYR' ? null : rate,
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
      wiseId: string;
      profileId: number;
      date: Date;
      description: string;
      merchant: string;
      amount: number;
      currency: string;
      originalAmount: number | null;
      originalCurrency: string | null;
      exchangeRate: number | null;
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
        
        const parsed = await Promise.all(
          statementTransactions.map(t => 
            parseStatementTransaction(client, t, personalProfile.id)
          )
        );
        allTransactions = allTransactions.concat(parsed);
      } catch (error) {
        console.error(`Error fetching statement for balance ${balance.id}:`, error);
      }
    }

    // Deduplicate transactions by wiseId, keeping the best merchant name
    const transactionMap = new Map<string, typeof allTransactions[0]>();
    for (const t of allTransactions) {
      const existing = transactionMap.get(t.wiseId);
      if (!existing) {
        transactionMap.set(t.wiseId, t);
      } else {
        // Prefer transaction with better merchant name (not generic fallbacks)
        const isCurrentGeneric = t.merchant === 'Credit' || t.merchant === 'Transaction';
        const isExistingGeneric = existing.merchant === 'Credit' || existing.merchant === 'Transaction';
        if (!isCurrentGeneric && isExistingGeneric) {
          transactionMap.set(t.wiseId, t);
        }
      }
    }
    const deduplicatedTransactions = Array.from(transactionMap.values());

    let inserted = 0;
    let updated = 0;

    for (const transaction of deduplicatedTransactions) {
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
