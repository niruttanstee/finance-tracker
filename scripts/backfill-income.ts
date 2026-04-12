import 'dotenv/config';
import { db } from '../lib/db.js';
import { transactions } from '../lib/schema.js';
import { eq, and, isNull } from 'drizzle-orm';

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npx tsx scripts/backfill-income.ts <userId>');
    process.exit(1);
  }

  // Update all CREDIT transactions that have null category
  const result = await db
    .update(transactions)
    .set({ category: 'income', updatedAt: new Date() })
    .where(and(
      eq(transactions.userId, userId),
      eq(transactions.type, 'CREDIT'),
      isNull(transactions.category)
    ));

  console.log('Done - backfilled income category for CREDIT transactions');
}

main();