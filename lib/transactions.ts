import { db } from './db';
import { transactions, categories, type Transaction } from './schema';
import { eq, desc, gte, lte, and, sql, isNull } from 'drizzle-orm';
import { recalculateNextMonthBudget } from './budgets';
import { getCategoryByName } from './categories';

export interface TransactionFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  type?: 'DEBIT' | 'CREDIT';
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
}

export interface PaginatedTransactions {
  transactions: Transaction[];
  total: number;
}

export async function getTransactions(
  userId: string,
  filters?: TransactionFilters,
  limit = 100,
  offset = 0
): Promise<PaginatedTransactions> {
  const conditions = [eq(transactions.userId, userId)];

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

  const whereClause = and(...conditions);

  const [data, countResult] = await Promise.all([
    db.query.transactions.findMany({
      where: whereClause,
      orderBy: [desc(transactions.date)],
      limit,
      offset,
    }),
    db.select({ count: sql<number>`count(*)` }).from(transactions).where(whereClause),
  ]);

  return {
    transactions: data,
    total: countResult[0]?.count || 0,
  };
}

export async function getTransactionById(id: string): Promise<Transaction | undefined> {
  return db.query.transactions.findFirst({
    where: eq(transactions.id, id),
  });
}

export async function updateTransactionCategory(
  id: string,
  category: string | null,
  userId: string
): Promise<void> {
  // Get the transaction first to know its date and old category (and verify ownership)
  const transaction = await getTransactionById(id);
  if (!transaction || transaction.userId !== userId) {
    throw new Error('Transaction not found');
  }

  // Update the transaction
  await db
    .update(transactions)
    .set({ category, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));

  // Trigger recalculation for next month if the transaction has a category
  if (category) {
    const categoryObj = await getCategoryByName(category, userId);
    if (categoryObj) {
      await recalculateNextMonthBudget(categoryObj.id, transaction.date, userId);
    }
  }

  // Also recalculate for the old category if there was one
  if (transaction.category) {
    const oldCategoryObj = await getCategoryByName(transaction.category, userId);
    if (oldCategoryObj) {
      await recalculateNextMonthBudget(oldCategoryObj.id, transaction.date, userId);
    }
  }
}

export async function getMonthlySpending(
  userId: string,
  months = 6
): Promise<{ month: string; amount: number }[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const result = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`,
      amount: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      gte(transactions.date, startDate),
      eq(transactions.ignored, false)
    ))
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM')`);

  return result;
}

export async function getCategoryBreakdown(
  userId: string,
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
        eq(transactions.userId, userId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        eq(transactions.ignored, false),
        eq(transactions.type, 'DEBIT')
      )
    )
    .groupBy(transactions.category);

  // Join with categories to get colors
  const categoryList = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
  });
  const categoryMap = new Map(categoryList.map(c => [c.name, c.color]));

  return result.map(r => ({
    category: r.category || 'Uncategorized',
    amount: r.amount,
    color: categoryMap.get(r.category || '') || '#6b7280',
  }));
}

export async function getUncategorizedCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      isNull(transactions.category),
      eq(transactions.ignored, false)
    ));

  return result[0]?.count || 0;
}

export function generateCompositeId(date: Date, merchant: string, amount: number, currency: string): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  const sanitizedMerchant = merchant.replace(/[^a-zA-Z0-9]/g, '_');
  const amountStr = amount.toFixed(2).replace('.', '_');
  return `${timestamp}_${sanitizedMerchant}_${amountStr}_${currency}`;
}

export interface IncomingTransactionFields {
  date: Date;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  originalAmount: number | null;
  originalCurrency: string | null;
  exchangeRate: number | null;
  type: 'DEBIT' | 'CREDIT';
}

/**
 * Returns true if all transaction fields (except category and updatedAt)
 * are identical between the existing DB record and the incoming fields.
 * Category is excluded because users manually set it.
 */
export function isTransactionIdentical(
  existing: Transaction,
  incoming: IncomingTransactionFields
): boolean {
  return (
    existing.date.getTime() === incoming.date.getTime() &&
    existing.description === incoming.description &&
    existing.merchant === incoming.merchant &&
    existing.amount === incoming.amount &&
    existing.currency === incoming.currency &&
    existing.originalAmount === incoming.originalAmount &&
    existing.originalCurrency === incoming.originalCurrency &&
    existing.exchangeRate === incoming.exchangeRate &&
    existing.type === incoming.type
  );
}
