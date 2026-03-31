import { initDb, db } from '../lib/db.js';
import { categories } from '../lib/schema.js';

async function main() {
  console.log('Initializing database...');
  initDb();
  
  // Seed default categories
  const defaultCategories = [
    { id: 'food', name: 'Food & Dining', color: '#ef4444', isDefault: true },
    { id: 'shopping', name: 'Shopping', color: '#f97316', isDefault: true },
    { id: 'transport', name: 'Transportation', color: '#eab308', isDefault: true },
    { id: 'bills', name: 'Bills & Utilities', color: '#22c55e', isDefault: true },
    { id: 'entertainment', name: 'Entertainment', color: '#3b82f6', isDefault: true },
    { id: 'healthcare', name: 'Healthcare', color: '#a855f7', isDefault: true },
    { id: 'travel', name: 'Travel', color: '#ec4899', isDefault: true },
    { id: 'income', name: 'Income', color: '#14b8a6', isDefault: true },
    { id: 'other', name: 'Other', color: '#6b7280', isDefault: true },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }
  
  console.log('Database initialized successfully');
  process.exit(0);
}

main().catch(console.error);
