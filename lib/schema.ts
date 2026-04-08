import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  profileId: integer('profile_id').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  merchant: text('merchant').notNull(),
  amount: real('amount').notNull(), // Now always in MYR
  currency: text('currency', { length: 3 }).notNull().default('MYR'), // Always MYR
  originalAmount: real('original_amount'), // Amount in source currency
  originalCurrency: text('original_currency', { length: 3 }), // Source currency code
  exchangeRate: real('exchange_rate'), // Rate used for conversion
  type: text('type', { enum: ['DEBIT', 'CREDIT'] }).notNull(),
  category: text('category'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  defaultBudget: real('default_budget').notNull().default(0),
  noRollover: integer('no_rollover', { mode: 'boolean' }).notNull().default(false),
});

export const categoryBudgets = sqliteTable('category_budgets', {
  id: text('id').primaryKey(), // composite: categoryId_yearMonth
  categoryId: text('category_id').notNull().references(() => categories.id),
  yearMonth: text('year_month', { length: 7 }).notNull(), // YYYY-MM format
  monthlyLimit: real('monthly_limit').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().default('app_settings'),
  apiProvider: text('api_provider'), // 'wise' | null
  apiKey: text('api_key'), // encrypted or plain Wise token
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryBudget = typeof categoryBudgets.$inferSelect;
export type NewCategoryBudget = typeof categoryBudgets.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;