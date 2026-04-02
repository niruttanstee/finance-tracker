import { NextResponse } from 'next/server';
import { getBudgetForCategory, updateBudgetLimit } from '@/lib/budgets';

export async function GET(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('yearMonth');

    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: 'Valid yearMonth required (YYYY-MM format)' },
        { status: 400 }
      );
    }

    const budget = await getBudgetForCategory(params.categoryId, yearMonth);

    if (!budget) {
      return NextResponse.json(
        { error: 'Budget not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: budget });
  } catch (error) {
    console.error('Error fetching budget:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budget' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { categoryId: string } }
) {
  try {
    const { yearMonth, monthlyLimit } = await request.json();

    if (!yearMonth || typeof monthlyLimit !== 'number') {
      return NextResponse.json(
        { error: 'yearMonth and monthlyLimit required' },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: 'yearMonth must be in YYYY-MM format' },
        { status: 400 }
      );
    }

    if (monthlyLimit < 0) {
      return NextResponse.json(
        { error: 'monthlyLimit must be non-negative' },
        { status: 400 }
      );
    }

    const budget = await updateBudgetLimit(params.categoryId, yearMonth, monthlyLimit);

    return NextResponse.json({ data: budget });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}