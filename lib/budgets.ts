import { db } from './db';
import { categoryBudgets, transactions, categories, type CategoryBudget } from './schema';
import { eq, and, gte, lte, sql, asc } from 'drizzle-orm';

export interface BudgetWithSpending {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  monthlyLimit: number;
  baseBudget: number;
  rolloverAmount: number;
  spent: number;
  remaining: number;
  overspent: boolean;
  savedAmount: number;
  noRollover: boolean;
}

// Get budget for a specific category and month
export async function getBudgetForCategory(
  categoryId: string,
  yearMonth: string,
  userId: string
): Promise<CategoryBudget | undefined> {
  const id = `${categoryId}_${yearMonth}`;
  return db.query.categoryBudgets.findFirst({
    where: and(eq(categoryBudgets.id, id), eq(categoryBudgets.userId, userId)),
  });
}

// Utility functions for month navigation
export function getPreviousYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month - 2 because months are 0-indexed and we want previous
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getNextYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month, 1); // month is already 1-indexed, so this gives us next month
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function parseYearMonth(yearMonth: string): { year: number; month: number } {
  const [year, month] = yearMonth.split('-').map(Number);
  return { year, month };
}

// Get spending for a specific category in a specific month
export async function getSpendingForCategory(
  categoryName: string,
  yearMonth: string,
  userId: string
): Promise<number> {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const result = await db
    .select({
      spent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.category, categoryName)
      )
    );

  return result[0]?.spent || 0;
}

// Calculate rollover amount from previous month
export async function calculateRolloverAmount(
  categoryId: string,
  categoryName: string,
  yearMonth: string,
  userId: string
): Promise<number> {
  // Get category to check if rollover is disabled
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
  });

  // If category has noRollover flag, don't calculate rollover
  if (category?.noRollover) {
    return 0;
  }

  const prevMonth = getPreviousYearMonth(yearMonth);

  // Get previous month's budget
  const prevBudget = await getBudgetForCategory(categoryId, prevMonth, userId);
  if (!prevBudget) return 0;

  // Get previous month's spending
  const spent = await getSpendingForCategory(categoryName, prevMonth, userId);
  const savings = prevBudget.monthlyLimit - spent;

  return Math.max(0, savings); // No negative rollover (debt)
}

// Get or create budget with rollover
export async function getOrCreateBudgetWithRollover(
  categoryId: string,
  categoryName: string,
  yearMonth: string,
  userId: string
): Promise<CategoryBudget> {
  const existing = await getBudgetForCategory(categoryId, yearMonth, userId);

  if (existing) {
    return existing;
  }

  // Get category's default budget
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
  });

  const defaultBudget = category?.defaultBudget || 0;

  // Calculate rollover from previous month
  const rollover = await calculateRolloverAmount(categoryId, categoryName, yearMonth, userId);
  const monthlyLimit = defaultBudget + rollover;

  // Create the budget
  return getOrCreateBudget(categoryId, yearMonth, monthlyLimit, userId);
}

// Cascade recalculate budgets from a starting month forward
export async function cascadeRecalculateFromMonth(
  categoryId: string,
  startYearMonth: string,
  userId: string
): Promise<number> {
  const category = await db.query.categories.findFirst({
    where: and(eq(categories.id, categoryId), eq(categories.userId, userId)),
  });

  if (!category) return 0;

  // If category has noRollover flag, skip cascade recalculation
  if (category.noRollover) {
    return 0;
  }

  let monthsUpdated = 0;
  let currentMonth = startYearMonth;

  // Keep recalculating while budgets exist
  while (true) {
    const existingBudget = await getBudgetForCategory(categoryId, currentMonth, userId);
    if (!existingBudget) break;

    // Calculate this month's budget with rollover
    const rollover = await calculateRolloverAmount(categoryId, category.name, currentMonth, userId);
    const newBudget = category.defaultBudget + rollover;

    // Update budget only if it changed
    if (existingBudget.monthlyLimit !== newBudget) {
      await updateBudgetLimit(categoryId, currentMonth, newBudget, userId);
    }
    monthsUpdated++;

    // Move to next month
    currentMonth = getNextYearMonth(currentMonth);

    // Safety limit to prevent infinite loops
    if (monthsUpdated > 120) break; // Max 10 years
  }

  return monthsUpdated;
}

// Recalculate all budgets for a category from the earliest month
export async function recalculateAllBudgets(categoryId: string, userId: string): Promise<number> {
  // Find earliest budget month for this category
  const earliestBudget = await db.query.categoryBudgets.findFirst({
    where: and(eq(categoryBudgets.categoryId, categoryId), eq(categoryBudgets.userId, userId)),
    orderBy: (budgets, { asc }) => [asc(budgets.yearMonth)],
  });

  if (!earliestBudget) return 0;

  return cascadeRecalculateFromMonth(categoryId, earliestBudget.yearMonth, userId);
}

// Recalculate budget for next month after transaction changes
export async function recalculateNextMonthBudget(
  categoryId: string,
  transactionDate: Date,
  userId: string
): Promise<void> {
  const year = transactionDate.getFullYear();
  const month = transactionDate.getMonth() + 1; // 1-indexed
  const nextMonthDate = new Date(year, month, 1);
  const nextYearMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Check if next month has a budget
  const nextMonthBudget = await getBudgetForCategory(categoryId, nextYearMonth, userId);
  if (nextMonthBudget) {
    // Recalculate from next month forward
    await cascadeRecalculateFromMonth(categoryId, nextYearMonth, userId);
  }
}

export async function getOrCreateBudget(
  categoryId: string,
  yearMonth: string,
  defaultLimit: number = 0,
  userId: string
): Promise<CategoryBudget> {
  const id = `${categoryId}_${yearMonth}`;

  const existing = await db.query.categoryBudgets.findFirst({
    where: and(eq(categoryBudgets.id, id), eq(categoryBudgets.userId, userId)),
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
      userId,
    })
    .returning();

  return budget;
}

export async function updateBudgetLimit(
  categoryId: string,
  yearMonth: string,
  monthlyLimit: number,
  userId: string
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
      userId,
    })
    .onConflictDoUpdate({
      target: [categoryBudgets.id, categoryBudgets.userId],
      set: { monthlyLimit, updatedAt: now },
    })
    .returning();

  return budget;
}

export async function getBudgetsWithSpending(
  yearMonth: string,
  userId: string
): Promise<BudgetWithSpending[]> {
  // Get start and end of month
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get all categories for this user
  const allCategories = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
  });
  const budgets = await db.query.categoryBudgets.findMany({
    where: and(eq(categoryBudgets.yearMonth, yearMonth), eq(categoryBudgets.userId, userId)),
  });
  const budgetMap = new Map(budgets.map(b => [b.categoryId, b]));

  // Calculate spending per category for this user
  const spendingResult = await db
    .select({
      category: transactions.category,
      spent: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        sql`${transactions.category} IS NOT NULL`
      )
    )
    .groupBy(transactions.category);

  const spendingMap = new Map(spendingResult.map(s => [s.category, s.spent || 0]));

  // Build result for categories that have budgets set
  const result: BudgetWithSpending[] = [];

  for (const cat of allCategories) {
    const budget = budgetMap.get(cat.id);
    if (!budget || budget.monthlyLimit <= 0) continue;

    const spent = spendingMap.get(cat.name) || 0;
    const remaining = Math.max(0, budget.monthlyLimit - spent);
    const overspent = spent > budget.monthlyLimit;
    const savedAmount = spent < budget.monthlyLimit ? budget.monthlyLimit - spent : 0;

    // Calculate rollover from previous month
    const rolloverAmount = await calculateRolloverAmount(cat.id, cat.name, yearMonth, userId);
    const baseBudget = budget.monthlyLimit - rolloverAmount;

    result.push({
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color,
      monthlyLimit: budget.monthlyLimit,
      baseBudget,
      rolloverAmount,
      spent,
      remaining,
      overspent,
      savedAmount,
      noRollover: cat.noRollover || false,
    });
  }

  return result;
}