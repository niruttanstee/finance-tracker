import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  profileId: integer('profile_id').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  description: text('description').notNull(),
  merchant: text('merchant').notNull(),
  amount: real('amount').notNull(),
  currency: text('currency', { length: 3 }).notNull(),
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
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
