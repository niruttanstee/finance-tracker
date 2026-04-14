import { db } from '../lib/db';
import { transactions, categories } from '../lib/schema';

async function resetDatabase() {
  console.log('Dropping all transactions...');
  await db.delete(transactions);
  
  console.log('Dropping all categories...');
  await db.delete(categories);
  
  // Re-seed default categories
  console.log('Re-seeding default categories...');
  const defaultCategories = [
    { id: 'food', name: 'Food & Dining', color: '#ef4444', isDefault: true, userId: '' },
    { id: 'shopping', name: 'Shopping', color: '#f97316', isDefault: true, userId: '' },
    { id: 'transport', name: 'Transportation', color: '#eab308', isDefault: true, userId: '' },
    { id: 'bills', name: 'Bills & Utilities', color: '#22c55e', isDefault: true, userId: '' },
    { id: 'entertainment', name: 'Entertainment', color: '#3b82f6', isDefault: true, userId: '' },
    { id: 'healthcare', name: 'Healthcare', color: '#a855f7', isDefault: true, userId: '' },
    { id: 'travel', name: 'Travel', color: '#ec4899', isDefault: true, userId: '' },
    { id: 'income', name: 'Income', color: '#14b8a6', isDefault: true, userId: '' },
    { id: 'other', name: 'Other', color: '#6b7280', isDefault: true, userId: '' },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }
  
  console.log('Database reset complete. Run sync to re-fetch transactions.');
  process.exit(0);
}

resetDatabase().catch(console.error);
