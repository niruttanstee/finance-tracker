import { NextResponse } from 'next/server';
import { getTransactions, updateTransactionCategory } from '@/lib/transactions';

export async function GET(request: Request) {
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

    // TODO: Get userId from auth session
    const userId = 'current-user';
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

export async function PATCH(request: Request) {
  try {
    const { id, category } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Transaction ID required' },
        { status: 400 }
      );
    }

    await updateTransactionCategory(id, category);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json(
      { error: 'Failed to update transaction' },
      { status: 500 }
    );
  }
}
