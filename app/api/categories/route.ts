import { NextResponse } from 'next/server';
import { getAllCategories, createCategory, updateCategory, deleteCategory, updateCategoryDefaultBudget } from '@/lib/categories';
import { recalculateAllBudgets } from '@/lib/budgets';

export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, color, defaultBudget = 0, noRollover = false } = body;
    
    if (!name || !color) {
      return NextResponse.json(
        { error: 'Name and color are required' },
        { status: 400 }
      );
    }
    
    const category = await createCategory(name, color, noRollover);
    
    // Set default budget if provided
    if (defaultBudget > 0) {
      await updateCategoryDefaultBudget(category.id, defaultBudget);
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

export async function PUT(request: Request) {
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
      category = await updateCategory(id, name, color, noRollover);
    } else if (typeof noRollover !== 'undefined') {
      // Just update noRollover if that's all that's being changed
      category = await updateCategory(id, '', '', noRollover);
    }
    
    // Update default budget if provided and trigger cascade
    if (typeof defaultBudget === 'number' && defaultBudget >= 0) {
      category = await updateCategoryDefaultBudget(id, defaultBudget);
      
      // Trigger cascade recalculation for all months
      const monthsUpdated = await recalculateAllBudgets(id);
      
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    await deleteCategory(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete category' },
      { status: 500 }
    );
  }
}
