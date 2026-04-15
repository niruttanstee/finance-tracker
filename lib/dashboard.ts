import { db } from './db';
import { transactions, categories } from './schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface DashboardData {
  month: string;
  spending: number;
  savings: number;
  availableFunds: number;
  categoryBreakdown: { category: string; amount: number; color: string }[];
  categorySpendingTrend: { month: string; [category: string]: number | string }[];
}

export async function getDashboardData(monthStr: string, userId: string): Promise<DashboardData> {
  const monthDate = new Date(monthStr + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  // Get 6-month trend ending at selected month
  const trendStart = startOfMonth(subMonths(monthDate, 5));

  // Fetch category spending trend (last 6 months by category)
  const categoryTrendData = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`,
      category: transactions.category,
      amount: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, trendStart),
        eq(transactions.ignored, false),
        eq(transactions.type, 'DEBIT')
      )
    )
    .groupBy(
      sql`to_char(${transactions.date}, 'YYYY-MM')`,
      transactions.category
    )
    .orderBy(sql`to_char(${transactions.date}, 'YYYY-MM')`);

  // Get user's categories and their colors
  const categoryList = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
  });
  const categoryMap = new Map(categoryList.map(c => [c.name, c.color]));

  // Build category spending trend with all months and categories
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = subMonths(monthDate, i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const categoryNames = categoryList.map(c => c.name);
  const categorySpendingTrend = months.map(month => {
    const monthData: { month: string; [key: string]: number | string } = { month };
    categoryNames.forEach(cat => {
      const spending = categoryTrendData
        .filter(d => d.month === month && d.category === cat)
        .reduce((sum, d) => sum + d.amount, 0);
      monthData[cat] = spending;
    });
    return monthData;
  });

  // Calculate current month spending and savings from categoryTrendData (already fetched)
  const currentMonthTrend = categoryTrendData.filter(d => d.month === monthStr);
  const currentMonthSpending = currentMonthTrend.reduce((sum, d) => sum + d.amount, 0);
  const savings = currentMonthTrend
    .filter(d => d.category === 'Savings')
    .reduce((sum, d) => sum + d.amount, 0);

  // Calculate current month income (separate query - different type filter)
  const incomeData = await db
    .select({
      amount: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
        eq(transactions.ignored, false),
        eq(transactions.type, 'CREDIT')
      )
    );

  const income = incomeData[0]?.amount || 0;
  const availableFunds = income - currentMonthSpending;

  // Category breakdown for current month
  const categoryData = await db
    .select({
      category: transactions.category,
      amount: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
        eq(transactions.ignored, false),
        eq(transactions.type, 'DEBIT')
      )
    )
    .groupBy(transactions.category);

  const categoryBreakdown = categoryData.map(r => ({
    category: r.category || 'Uncategorized',
    amount: r.amount,
    color: categoryMap.get(r.category || '') || '#6b7280',
  }));

  return {
    month: monthStr,
    spending: currentMonthSpending,
    savings,
    availableFunds,
    categoryBreakdown,
    categorySpendingTrend,
  };
}
