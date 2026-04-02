import { db } from './db';
import { transactions, type Transaction } from './schema';
import { eq, desc, gte, lte, and, sql } from 'drizzle-orm';
import { recalculateNextMonthBudget } from './budgets';
import { getCategoryByName } from './categories';

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  type?: 'DEBIT' | 'CREDIT';
}

export async function getTransactions(
  filters?: TransactionFilters,
  limit = 100,
  offset = 0
): Promise<Transaction[]> {
  const conditions = [];

  if (filters?.startDate) {
    conditions.push(gte(transactions.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(transactions.date, filters.endDate));
  }
  if (filters?.category) {
    conditions.push(eq(transactions.category, filters.category));
  }
  if (filters?.type) {
    conditions.push(eq(transactions.type, filters.type));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return db.query.transactions.findMany({
    where: whereClause,
    orderBy: [desc(transactions.date)],
    limit,
    offset,
  });
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  return db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });
}

export async function updateTransactionCategory(
  id: string,
  category: string | null
): Promise<void> {
  // Get the transaction first to know its date and old category
  const transaction = await getTransactionById(id);
  if (!transaction) {
    throw new Error('Transaction not found');
  }

  // Update the transaction
  await db
    .update(transactions)
    .set({ category, updatedAt: new Date() })
    .where(eq(transactions.id, id));

  // Trigger recalculation for next month if the transaction has a category
  if (category) {
    const categoryObj = await getCategoryByName(category);
    if (categoryObj) {
      await recalculateNextMonthBudget(categoryObj.id, transaction.date);
    }
  }
  
  // Also recalculate for the old category if there was one
  if (transaction.category) {
    const oldCategoryObj = await getCategoryByName(transaction.category);
    if (oldCategoryObj) {
      await recalculateNextMonthBudget(oldCategoryObj.id, transaction.date);
    }
  }
}

export async function getMonthlySpending(
  months = 6
): Promise<{ month: string; amount: number }[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const result = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`,
      amount: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(gte(transactions.date, startDate))
    .groupBy(sql`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`);

  return result;
}

export async function getCategoryBreakdown(
  startDate: Date,
  endDate: Date
): Promise<{ category: string; amount: number; color: string }[]> {
  const result = await db
    .select({
      category: transactions.category,
      amount: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.type, 'DEBIT')
      )
    )
    .groupBy(transactions.category);

  // Join with categories to get colors
  const categoryList = await db.query.categories.findMany();
  const categoryMap = new Map(categoryList.map(c => [c.name, c.color]));

  return result.map(r => ({
    category: r.category || 'Uncategorized',
    amount: r.amount,
    color: categoryMap.get(r.category || '') || '#6b7280',
  }));
}

export async function getUncategorizedCount(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(eq(transactions.category, sql`NULL`));

  return result[0]?.count || 0;
}
