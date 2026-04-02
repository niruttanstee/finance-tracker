import { db } from './db';
import { transactions } from './schema';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export interface DashboardData {
  month: string;
  spending: number;
  income: number;
  savings: number;
  savingsRate: number;
  categoryBreakdown: { category: string; amount: number; color: string }[];
  monthlyTrend: { month: string; spending: number; income: number; savings: number }[];
}

export async function getDashboardData(monthStr: string): Promise<DashboardData> {
  const monthDate = new Date(monthStr + '-01');
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  
  // Get 6-month trend ending at selected month
  const trendStart = startOfMonth(subMonths(monthDate, 5));
  
  // Fetch monthly trend data
  const trendData = await db
    .select({
      month: sql<string>`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`,
      spending: sql<number>`SUM(CASE WHEN ${transactions.type} = 'DEBIT' THEN ${transactions.amount} ELSE 0 END)`,
      income: sql<number>`SUM(CASE WHEN ${transactions.type} = 'CREDIT' THEN ${transactions.amount} ELSE 0 END)`,
    })
    .from(transactions)
    .where(gte(transactions.date, trendStart))
    .groupBy(sql`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`)
    .orderBy(sql`strftime('%Y-%m', ${transactions.date}, 'unixepoch')`);
  
  // Fetch category breakdown for selected month
  const categoryData = await db
    .select({
      category: transactions.category,
      amount: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, monthStart),
        lte(transactions.date, monthEnd),
        eq(transactions.type, 'DEBIT')
      )
    )
    .groupBy(transactions.category);
  
  // Get category colors
  const categoryList = await db.query.categories.findMany();
  const categoryMap = new Map(categoryList.map(c => [c.name, c.color]));
  
  const categoryBreakdown = categoryData.map(r => ({
    category: r.category || 'Uncategorized',
    amount: r.amount,
    color: categoryMap.get(r.category || '') || '#6b7280',
  }));
  
  // Calculate totals for selected month
  const monthData = trendData.find(d => d.month === monthStr) || { spending: 0, income: 0 };
  const spending = monthData.spending;
  const income = monthData.income;
  const savings = income - spending;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  
  return {
    month: monthStr,
    spending,
    income,
    savings,
    savingsRate,
    categoryBreakdown,
    monthlyTrend: trendData.map(d => ({
      month: d.month,
      spending: d.spending,
      income: d.income,
      savings: d.income - d.spending,
    })),
  };
}
