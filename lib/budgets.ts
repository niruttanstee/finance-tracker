import { db } from './db';
import { categoryBudgets, transactions, categories, type CategoryBudget } from './schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface BudgetWithSpending {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
}

export async function getOrCreateBudget(
  categoryId: string,
  yearMonth: string,
  defaultLimit: number = 0
): Promise<CategoryBudget> {
  const id = `${categoryId}_${yearMonth}`;

  const existing = await db.query.categoryBudgets.findFirst({
    where: eq(categoryBudgets.id, id),
  });

  if (existing) {
    return existing;
  }

  const now = new Date();
  const [budget] = await db
    .insert(categoryBudgets)
    .values({
      id,
      categoryId,
      yearMonth,
      monthlyLimit: defaultLimit,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return budget;
}

export async function updateBudgetLimit(
  categoryId: string,
  yearMonth: string,
  monthlyLimit: number
): Promise<CategoryBudget> {
  const id = `${categoryId}_${yearMonth}`;
  const now = new Date();

  const [budget] = await db
    .insert(categoryBudgets)
    .values({
      id,
      categoryId,
      yearMonth,
      monthlyLimit,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: categoryBudgets.id,
      set: { monthlyLimit, updatedAt: now },
    })
    .returning();

  return budget;
}

export async function getBudgetsWithSpending(
  yearMonth: string
): Promise<BudgetWithSpending[]> {
  // Get start and end of month
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all categories with their budgets for this month
  const allCategories = await db.query.categories.findMany();
  const budgets = await db.query.categoryBudgets.findMany({
    where: eq(categoryBudgets.yearMonth, yearMonth),
  });
  const budgetMap = new Map(budgets.map(b => [b.categoryId, b]));

  // Calculate spending per category
  const spendingResult = await db
    .select({
      category: transactions.category,
      spent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        sql`${transactions.category} IS NOT NULL`
      )
    )
    .groupBy(transactions.category);

  const spendingMap = new Map(spendingResult.map(s => [s.category, s.spent || 0]));

  // Build result for categories that have budgets set
  return allCategories
    .filter(cat => {
      const budget = budgetMap.get(cat.id);
      return budget && budget.monthlyLimit > 0;
    })
    .map(cat => {
      const budget = budgetMap.get(cat.id)!;
      const spent = spendingMap.get(cat.name) || 0;
      const remaining = Math.max(0, budget.monthlyLimit - spent);
      const overspent = spent > budget.monthlyLimit;
      const savedAmount = spent < budget.monthlyLimit ? budget.monthlyLimit - spent : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        monthlyLimit: budget.monthlyLimit,
        spent,
        remaining,
        overspent,
        savedAmount,
      };
    });
}

export async function getBudgetForCategory(
  categoryId: string,
  yearMonth: string
): Promise<CategoryBudget | undefined> {
  const id = `${categoryId}_${yearMonth}`;
  return db.query.categoryBudgets.findFirst({
    where: eq(categoryBudgets.id, id),
  });
}