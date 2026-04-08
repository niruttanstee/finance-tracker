import { NextResponse } from 'next/server';
import { parseBankStatement } from '@/lib/bank-parser';
import { generateCompositeId } from '@/lib/transactions';
import { db } from '@/lib/db';
import { transactions } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
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

    for (const tx of parsed.transactions) {
      const compositeId = generateCompositeId(tx.date, tx.merchant, tx.amount, tx.currency);

      const existing = await db.query.transactions.findFirst({
        where: eq(transactions.id, compositeId),
      });

      if (existing) {
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
            updatedAt: new Date(),
          })
          .where(eq(transactions.id, compositeId));
        updated++;
      } else {
        await db.insert(transactions).values({
          id: compositeId,
          profileId: 0, // PDFs don't have profile IDs
          date: tx.date,
          description: tx.description,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          originalAmount: tx.originalAmount,
          originalCurrency: tx.originalCurrency,
          exchangeRate: tx.exchangeRate,
          type: tx.type,
          category: null,
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
