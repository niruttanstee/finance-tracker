import { pgTable, text, integer, real, timestamp, primaryKey, boolean } from 'drizzle-orm/pg-core';

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  profileId: integer('profile_id').notNull(),
  userId: text('user_id').notNull().default(''),
  date: timestamp('date').notNull(),
  description: text('description').notNull(),
  merchant: text('merchant').notNull(),
  amount: real('amount').notNull(), // Now always in MYR
  currency: text('currency').notNull().default('MYR'), // Always MYR
  originalAmount: real('original_amount'), // Amount in source currency
  originalCurrency: text('original_currency'), // Source currency code
  exchangeRate: real('exchange_rate'), // Rate used for conversion
  type: text('type', { enum: ['DEBIT', 'CREDIT'] }).notNull(),
  category: text('category'),
  ignored: boolean('ignored').notNull().default(false),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const categories = pgTable('categories', {
  id: text('id').notNull(),
  name: text('name').notNull(),
  color: text('color').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  defaultBudget: real('default_budget').notNull().default(0),
  noRollover: boolean('no_rollover').notNull().default(false),
  userId: text('user_id').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.id, table.userId] }),
}));

export const categoryBudgets = pgTable('category_budgets', {
  id: text('id').primaryKey(), // composite: categoryId_yearMonth
  categoryId: text('category_id').notNull(),
  yearMonth: text('year_month').notNull(), // YYYY-MM format
  monthlyLimit: real('monthly_limit').notNull().default(0),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  userId: text('user_id').notNull(),
});

export const settings = pgTable('settings', {
  id: text('id').notNull().default('app_settings'),
  userId: text('user_id').notNull().default(''),
  apiProvider: text('api_provider'), // 'wise' | null
  apiKey: text('api_key'), // encrypted or plain Wise token
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.id, table.userId] }),
}));

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['superuser', 'user'] }).notNull().default('user'),
  createdAt: timestamp('created_at').notNull(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategoryBudget = typeof categoryBudgets.$inferSelect;
export type NewCategoryBudget = typeof categoryBudgets.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;