import { NextResponse } from 'next/server';
import { createWiseClient } from '@/lib/wise';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { transactions, settings } from '@/lib/schema';

import { generateCompositeId } from '@/lib/transactions';

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
  let myrAmount = absAmount;
  let rate = 1;
  
  if (sourceCurrency !== 'MYR') {
    try {
      const conversion = await convertToMYR(client, absAmount, sourceCurrency);
      myrAmount = conversion.myrAmount;
      rate = conversion.rate;
    } catch (error) {
      console.error(`Failed to convert ${absAmount} ${sourceCurrency} to MYR:`, error);
      // Fall back to using original amount if conversion fails
      myrAmount = absAmount;
      rate = 0;
    }
  }
  
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

export async function POST(request: Request) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Fetch user's Wise token from their settings
    const userSettings = await db.query.settings.findFirst({
      where: and(eq(settings.id, 'app_settings'), eq(settings.userId, userId)),
    });

    if (!userSettings?.apiKey) {
      return NextResponse.json(
        { error: 'No Wise token configured. Use PDF upload instead.' },
        { status: 400 }
      );
    }

    const client = createWiseClient(userSettings.apiKey);
    if (!client) {
      return NextResponse.json(
        { error: 'No Wise token configured. Use PDF upload instead.' },
        { status: 400 }
      );
    }
    
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
    console.log('Balance details:', balances.map(b => ({ id: b.id, currency: b.currency, amount: b.amount, type: (b as any).type })));

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
        console.log(`Fetching statement for balance ${balance.id} (${balance.currency})...`);
        const statementTransactions = await client.getBalanceStatement(
          personalProfile.id,
          balance.id,
          oneYearAgo,
          new Date()
        );
        console.log(`Found ${statementTransactions.length} transactions for balance ${balance.id}`);
        
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

    console.log(`Total transactions before deduplication: ${allTransactions.length}`);
    
    // Deduplicate by composite ID (timestamp + merchant + amount + currency)
    // This handles cases where the same transaction appears in multiple balance statements
    const transactionMap = new Map<string, typeof allTransactions[0]>();
    for (const t of allTransactions) {
      const existing = transactionMap.get(t.id);
      if (!existing) {
        transactionMap.set(t.id, t);
      } else {
        // Prefer transaction with better merchant name (not generic fallbacks)
        const isCurrentGeneric = t.merchant === 'Credit' || t.merchant === 'Transaction';
        const isExistingGeneric = existing.merchant === 'Credit' || existing.merchant === 'Transaction';
        if (!isCurrentGeneric && isExistingGeneric) {
          transactionMap.set(t.id, t);
        }
      }
    }
    const deduplicatedTransactions = Array.from(transactionMap.values());
    console.log(`Transactions after deduplication: ${deduplicatedTransactions.length}`);

    let inserted = 0;
    let updated = 0;

    for (const transaction of deduplicatedTransactions) {
      // Validate required fields
      if (!transaction.amount || isNaN(transaction.amount)) {
        console.warn(`Skipping transaction with invalid amount: ${transaction.id}`);
        continue;
      }
      
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
      unique: deduplicatedTransactions.length,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
