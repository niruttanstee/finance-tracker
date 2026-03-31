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

function parseActivity(activity: any): {
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
  const isDebit = activity.primaryAmount < 0;
  
  return {
    id: activity.id,
    profileId: activity.resource.id,
    date: new Date(activity.createdAt),
    description: activity.description,
    merchant: extractMerchant(activity.description),
    amount: Math.abs(activity.primaryAmount),
    currency: activity.primaryCurrency,
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

    // Get activities from last year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const activities = await client.getActivities(
      personalProfile.id,
      oneYearAgo,
      new Date()
    );

    let inserted = 0;
    let updated = 0;

    for (const activity of activities) {
      // Skip non-transaction activities
      if (!activity.type.includes('CARD') && !activity.type.includes('TRANSFER')) {
        continue;
      }

      const data = parseActivity(activity);
      
      // Check if transaction exists
      const existing = await db.query.transactions.findFirst({
        where: eq(transactions.id, data.id),
      });

      if (existing) {
        await db.update(transactions)
          .set({
            ...data,
            category: existing.category, // Preserve existing category
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, data.id));
        updated++;
      } else {
        await db.insert(transactions).values(data);
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      updated,
      total: activities.length,
    });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
