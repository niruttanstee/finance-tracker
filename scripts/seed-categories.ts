import 'dotenv/config';
import { db } from '../lib/db.js';
import { categories, users } from '../lib/schema.js';
import { eq } from 'drizzle-orm';

const DEFAULT_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', color: '#ef4444', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'shopping', name: 'Shopping', color: '#f97316', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'transport', name: 'Transportation', color: '#eab308', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'bills', name: 'Bills & Utilities', color: '#22c55e', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'entertainment', name: 'Entertainment', color: '#3b82f6', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'healthcare', name: 'Healthcare', color: '#a855f7', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'travel', name: 'Travel', color: '#ec4899', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'income', name: 'Income', color: '#14b8a6', isDefault: true, noRollover: false, defaultBudget: 0 },
  { id: 'savings', name: 'Savings', color: '#10b981', isDefault: true, noRollover: true, defaultBudget: 0 },
  { id: 'other', name: 'Other', color: '#6b7280', isDefault: true, noRollover: false, defaultBudget: 0 },
];

async function main() {
  const username = process.argv[2];

  if (!username) {
    console.error('Usage: npx tsx scripts/seed-categories.ts <username>');
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user) {
    console.error(`User '${username}' not found`);
    process.exit(1);
  }

  console.log(`Seeding categories for user: ${username} (id: ${user.id})`);

  for (const cat of DEFAULT_CATEGORIES) {
    await db.insert(categories).values({ ...cat, userId: user.id }).onConflictDoNothing();
  }

  console.log('Done');
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});