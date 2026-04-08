import { db } from '../lib/db.js';
import { categories, users } from '../lib/schema.js';
import { hashPassword } from '../lib/auth/password.js';
import { randomUUID } from 'crypto';

async function main() {
  console.log('Initializing database...');

  // Seed admin user if not exists
  const adminUsername = process.env.SEED_ADMIN_USER;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (adminUsername && adminPassword) {
    // Check if any users exist
    const allUsers = await db.select().from(users).limit(1);
    if (allUsers.length === 0) {
      const passwordHash = await hashPassword(adminPassword);
      await db.insert(users).values({
        id: randomUUID(),
        username: adminUsername,
        passwordHash,
        role: 'superuser',
        createdAt: new Date(),
      });
      console.log(`Admin user created: ${adminUsername}`);
    }
  }

  // Seed default categories for new installations
  const defaultCategories = [
    { id: 'food', name: 'Food & Dining', color: '#ef4444', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'shopping', name: 'Shopping', color: '#f97316', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'transport', name: 'Transportation', color: '#eab308', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'bills', name: 'Bills & Utilities', color: '#22c55e', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'entertainment', name: 'Entertainment', color: '#3b82f6', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'healthcare', name: 'Healthcare', color: '#a855f7', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'travel', name: 'Travel', color: '#ec4899', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'income', name: 'Income', color: '#14b8a6', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
    { id: 'savings', name: 'Savings', color: '#10b981', isDefault: true, noRollover: true, defaultBudget: 0, userId: '' },
    { id: 'other', name: 'Other', color: '#6b7280', isDefault: true, noRollover: false, defaultBudget: 0, userId: '' },
  ];

  for (const cat of defaultCategories) {
    await db.insert(categories).values(cat).onConflictDoNothing();
  }

  console.log('Database initialized successfully');
  process.exit(0);
}

main().catch((err) => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
