import { NextRequest, NextResponse } from 'next/server';
import {
  getBudgetsWithSpending,
  updateBudgetLimit,
  cascadeRecalculateFromMonth,
  getNextYearMonth
} from '@/lib/budgets';
import { updateCategoryDefaultBudget } from '@/lib/categories';
import { db } from '@/lib/db';
import { sessions } from '@/lib/schema';
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

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const yearMonth = searchParams.get('yearMonth');

    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json(
        { error: 'Valid yearMonth required (YYYY-MM format)' },
        { status: 400 }
      );
    }

    const budgets = await getBudgetsWithSpending(yearMonth, userId);

    return NextResponse.json({ data: budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch budgets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromCookie(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { categoryId, yearMonth, monthlyLimit, updateDefault = true } = body;

    if (!categoryId || !yearMonth || typeof monthlyLimit !== 'number') {
      return NextResponse.json(
        { error: 'categoryId, yearMonth, and monthlyLimit required' },
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

    const budget = await updateBudgetLimit(categoryId, yearMonth, monthlyLimit, userId);

    if (updateDefault) {
      await updateCategoryDefaultBudget(categoryId, monthlyLimit, userId);
    }

    const nextMonth = getNextYearMonth(yearMonth);
    const monthsUpdated = await cascadeRecalculateFromMonth(categoryId, nextMonth, userId);

    return NextResponse.json({
      data: budget,
      cascadeUpdated: monthsUpdated
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    return NextResponse.json(
      { error: 'Failed to update budget' },
      { status: 500 }
    );
  }
}