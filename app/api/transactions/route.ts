import { NextRequest, NextResponse } from 'next/server';
import { getTransactions, updateTransactionCategory, getTransactionById } from '@/lib/transactions';
import { db } from '@/lib/db';
import { sessions, transactions } from '@/lib/schema';
import { eq, and } from 'drizzle-orm';
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

export async function GET(request: NextRequest) {
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);

    const filters = {
      startDate: searchParams.get('startDate')
        ? new Date(searchParams.get('startDate')!)
        : undefined,
      endDate: searchParams.get('endDate')
        ? new Date(searchParams.get('endDate')!)
        : undefined,
      category: searchParams.get('category') || undefined,
      type: (searchParams.get('type') as 'DEBIT' | 'CREDIT') || undefined,
    };

    const pageParam = searchParams.get('page');
    const offsetParam = searchParams.get('offset');

    const limit = parseInt(searchParams.get('limit') || '50');
    const page = pageParam ? parseInt(pageParam) : 1;
    const offset = offsetParam ? parseInt(offsetParam) : (page - 1) * limit;

    const { transactions, total } = await getTransactions(userId, filters, limit, offset);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({ data: transactions, total, page, limit, totalPages });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, category, ignored } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    // Get transaction to verify ownership
    const tx = await getTransactionById(id);
    if (!tx || tx.userId !== userId) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Handle category update
    if (category !== undefined) {
      await updateTransactionCategory(id, category, userId);
    }

    // Handle ignored update
    if (ignored !== undefined) {
      await db
        .update(transactions)
        .set({ ignored, updatedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}