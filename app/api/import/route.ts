import { NextRequest, NextResponse } from 'next/server';
import { parseBankStatement } from '@/lib/bank-parser';
import { generateCompositeId, isTransactionIdentical } from '@/lib/transactions';
import { db } from '@/lib/db';
import { transactions, sessions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifySessionCookie, COOKIE_NAME } from '@/lib/auth/session';

async function getUserIdFromCookie(request: NextRequest): Promise<string | null> {
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (!cookieValue) return null;

  const sessionId = await verifySessionCookie(cookieValue);
  if (!sessionId) return null;

  const now = new Date();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session || session.expiresAt <= now) return null;
  return session.userId;
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse the PDF
    let parsed;
    try {
      parsed = await parseBankStatement(buffer);
    } catch (parseError) {
      console.error('PDF parse error:', parseError);
      return NextResponse.json(
        { error: 'Could not extract text from PDF. Is it a scanned document?' },
        { status: 422 }
      );
    }

    if (parsed.transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found in PDF. Unsupported bank format?', supported: ['Maybank', 'Aeon'] },
        { status: 422 }
      );
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const tx of parsed.transactions) {
      const compositeId = generateCompositeId(tx.date, tx.merchant, tx.amount, tx.currency);

      const existing = await db.query.transactions.findFirst({
        where: eq(transactions.id, compositeId),
      });

      if (existing) {
        // Build the incoming fields object for comparison
        const incomingFields = {
          date: tx.date,
          description: tx.description,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          originalAmount: tx.originalAmount,
          originalCurrency: tx.originalCurrency,
          exchangeRate: tx.exchangeRate,
          type: tx.type,
        };

        if (isTransactionIdentical(existing, incomingFields)) {
          // Record is identical — skip the write to preserve user-modified category
          skipped++;
        } else {
          await db
            .update(transactions)
            .set({
              description: tx.description,
              merchant: tx.merchant,
              amount: tx.amount,
              currency: tx.currency,
              originalAmount: tx.originalAmount,
              originalCurrency: tx.originalCurrency,
              exchangeRate: tx.exchangeRate,
              type: tx.type,
              category: existing.category, // Preserve existing category
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, compositeId));
          updated++;
        }
      } else {
        await db.insert(transactions).values({
          id: compositeId,
          profileId: 0,
          userId,
          date: tx.date,
          description: tx.description,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          originalAmount: tx.originalAmount,
          originalCurrency: tx.originalCurrency,
          exchangeRate: tx.exchangeRate,
          type: tx.type,
          category: tx.type === 'CREDIT' ? 'Income' : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      bank: parsed.bank,
      inserted,
      updated,
      skipped,
      total: parsed.transactions.length,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}