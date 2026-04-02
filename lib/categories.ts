import { db } from './db';
import { categories, type Category } from './schema';
import { eq } from 'drizzle-orm';

export async function getAllCategories(): Promise<Category[]> {
  return db.query.categories.findMany({
    orderBy: (categories, { asc }) => [asc(categories.name)],
  });
}

export async function getCategoryById(id: string): Promise<Category | undefined> {
  return db.query.categories.findFirst({
    where: eq(categories.id, id),
  });
}

export async function createCategory(
  name: string,
  color: string,
  noRollover: boolean = false
): Promise<Category> {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  const [category] = await db
    .insert(categories)
    .values({ id, name, color, isDefault: false, noRollover })
    .returning();
  return category;
}

export async function updateCategory(
  id: string,
  name: string,
  color: string,
  noRollover?: boolean
): Promise<Category> {
  // Don't update default categories
  const existingCategory = await getCategoryById(id);
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
    .where(eq(categories.id, id))
    .returning();
  
  if (!category) {
    throw new Error('Category not found');
  }
  
  return category;
}

export async function updateCategoryDefaultBudget(
  id: string,
  defaultBudget: number
): Promise<Category> {
  const [category] = await db
    .update(categories)
    .set({ defaultBudget })
    .where(eq(categories.id, id))
    .returning();
  
  if (!category) {
    throw new Error('Category not found');
  }
  
  return category;
}

export async function getCategoryByName(name: string): Promise<Category | undefined> {
  return db.query.categories.findFirst({
    where: eq(categories.name, name),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  // Don't delete default categories
  const category = await getCategoryById(id);
  if (category?.isDefault) {
    throw new Error('Cannot delete default categories');
  }
  
  await db.delete(categories).where(eq(categories.id, id));
}