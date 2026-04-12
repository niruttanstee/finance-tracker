import { db } from './db';
import { categories, type Category } from './schema';
import { eq, and } from 'drizzle-orm';

export async function getAllCategories(userId: string): Promise<Category[]> {
  return db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });
}

export async function getCategoryById(id: string, userId: string): Promise<Category | undefined> {
  return db.query.categories.findFirst({
    where: and(eq(categories.id, id), eq(categories.userId, userId)),
  });
}

export async function createCategory(
  name: string,
  color: string,
  noRollover: boolean = false,
  userId: string
): Promise<Category> {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  const [category] = await db
    .insert(categories)
    .values({ id, name, color, isDefault: false, noRollover, userId })
    .returning();
  return category;
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  noRollover: boolean | undefined,
  userId: string
): Promise<Category> {
  // Don't update default categories
  const existingCategory = await getCategoryById(id, userId);
  if (existingCategory?.isDefault) {
    throw new Error('Cannot modify default categories');
  }

  const updateData: { name?: string; color?: string; noRollover?: boolean } = { name, color };
  if (typeof noRollover !== 'undefined') {
    updateData.noRollover = noRollover;
  }

  const [category] = await db
    .update(categories)
    .set(updateData)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!category) {
    throw new Error('Category not found');
  }

  return category;
}

export async function updateCategoryDefaultBudget(
  id: string,
  defaultBudget: number,
  userId: string
): Promise<Category> {
  const [category] = await db
    .update(categories)
    .set({ defaultBudget })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .returning();

  if (!category) {
    throw new Error('Category not found');
  }

  return category;
}

export async function getCategoryByName(name: string, userId: string): Promise<Category | undefined> {
  return db.query.categories.findFirst({
    where: and(eq(categories.name, name), eq(categories.userId, userId)),
  });
}

export async function deleteCategory(id: string, userId: string): Promise<void> {
  // Don't delete default categories
  const category = await getCategoryById(id, userId);
  if (category?.isDefault) {
    throw new Error('Cannot delete default categories');
  }

  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', color: '#ef4444', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'shopping', name: 'Shopping', color: '#f97316', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'transport', name: 'Transportation', color: '#eab308', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'bills', name: 'Bills & Utilities', color: '#22c55e', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'entertainment', name: 'Entertainment', color: '#3b82f6', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'healthcare', name: 'Healthcare', color: '#a855f7', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'travel', name: 'Travel', color: '#ec4899', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'income', name: 'Income', color: '#14b8a6', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'savings', name: 'Savings', color: '#10b981', isDefault: true, noRollover: true, defaultBudget: 0 },
  { id: 'other', name: 'Other', color: '#6b7280', isDefault: true, noRollover: false, defaultBudget: 0 },
];

export async function seedDefaultCategories(userId: string): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({ ...cat, userId }).onConflictDoNothing();
  }
}