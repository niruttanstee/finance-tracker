import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, updateCategory, deleteCategory, updateCategoryDefaultBudget } from '@/lib/categories';
import { recalculateAllBudgets } from '@/lib/budgets';
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
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = await getAllCategories(userId);
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, color, defaultBudget = 0, noRollover = false } = body;

    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }

    const category = await createCategory(name, color, noRollover, userId);

    // Set default budget if provided
    if (defaultBudget > 0) {
      await updateCategoryDefaultBudget(category.id, defaultBudget, userId);
    }

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, color, defaultBudget, noRollover } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    let category;

    // Update name/color/noRollover if provided
    if (name && color) {
      category = await updateCategory(id, name, color, noRollover, userId);
    } else if (typeof noRollover !== 'undefined') {
      // Just update noRollover if that's all that's being changed
      category = await updateCategory(id, '', '', noRollover, userId);
    }

    // Update default budget if provided and trigger cascade
    if (typeof defaultBudget === 'number' && defaultBudget >= 0) {
      category = await updateCategoryDefaultBudget(id, defaultBudget, userId);

      // Trigger cascade recalculation for all months
      const monthsUpdated = await recalculateAllBudgets(id, userId);

      return NextResponse.json({
        data: category,
        cascadeUpdated: monthsUpdated
      });
    }

    return NextResponse.json({ data: category });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserIdFromCookie(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }

    await deleteCategory(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete category' },
      { status: 500 }
    );
  }
}
