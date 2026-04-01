import { db } from '../lib/db';
import { transactions } from '../lib/schema';
import { sql, eq, and } from 'drizzle-orm';

function generateCompositeId(date: Date, merchant: string, amount: number, currency: string): string {
  const timestamp = Math.floor(date.getTime() / 1000);
  const sanitizedMerchant = merchant.replace(/[^a-zA-Z0-9]/g, '_');
  const amountStr = amount.toFixed(2).replace('.', '_');
  return `${timestamp}_${sanitizedMerchant}_${amountStr}_${currency}`;
}

async function cleanupDuplicates() {
  console.log('Starting duplicate cleanup...\n');

  // Get all transactions
  const allTransactions = await db.query.transactions.findMany();
  console.log(`Found ${allTransactions.length} total transactions`);

  // Group by (date, amount, currency) - ignore merchant name since it varies
  const groups = new Map<string, typeof allTransactions>();
  
  for (const transaction of allTransactions) {
    const date = transaction.date instanceof Date ? transaction.date : new Date(transaction.date);
    // Normalize date to start of day for grouping
    const dateKey = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    const groupKey = `${dateKey}_${transaction.amount}_${transaction.currency}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(transaction);
  }

  let duplicatesFound = 0;
  let cleaned = 0;
  let updated = 0;

  for (const [groupKey, groupTransactions] of Array.from(groups.entries())) {
    if (groupTransactions.length > 1) {
      duplicatesFound += groupTransactions.length - 1;
      console.log(`Found ${groupTransactions.length} duplicates for: ${groupTransactions[0].merchant} (${groupTransactions[0].currency} ${groupTransactions[0].amount})`);
      
      // Keep the one with best merchant name (not generic) and/or category
      const isGeneric = (m: string) => m === 'Credit' || m === 'Transaction' || m === 'Debit';
      
      // Score each transaction: prefer non-generic merchant and existing category
      const scored = groupTransactions.map((t, index) => ({
        transaction: t,
        index,
        score: (t.category ? 2 : 0) + (!isGeneric(t.merchant) ? 1 : 0)
      }));
      
      // Sort by score descending, pick the best
      scored.sort((a, b) => b.score - a.score);
      const keep = scored[0].transaction;
      const toDelete = groupTransactions.filter((_, i) => i !== scored[0].index);
      
      // Generate new composite ID for the one we're keeping
      const newId = generateCompositeId(
        keep.date instanceof Date ? keep.date : new Date(keep.date),
        keep.merchant,
        keep.amount,
        keep.currency
      );
      
      // Delete duplicates by their rowid (we'll use raw SQL to get rowid)
      for (const dup of toDelete) {
        const dupDateTimestamp = Math.floor((dup.date instanceof Date ? dup.date : new Date(dup.date)).getTime() / 1000);
        
        // Find and delete this specific duplicate
        await db.run(sql`
          DELETE FROM transactions 
          WHERE rowid = (
            SELECT rowid FROM transactions 
            WHERE (id = ${dup.id} OR (id IS NULL AND date = ${dupDateTimestamp} AND merchant = ${dup.merchant} AND amount = ${dup.amount} AND currency = ${dup.currency}))
            LIMIT 1
          )
        `);
        cleaned++;
      }
      console.log(`  → Deleted ${toDelete.length} duplicate(s)`);
      
      // Update the kept transaction with the new composite ID
      const keepDateTimestamp = Math.floor((keep.date instanceof Date ? keep.date : new Date(keep.date)).getTime() / 1000);
      
      try {
        await db.run(sql`
          UPDATE transactions 
          SET id = ${newId}, updated_at = ${Math.floor(Date.now() / 1000)}
          WHERE (id = ${keep.id} OR (id IS NULL AND date = ${keepDateTimestamp} AND merchant = ${keep.merchant} AND amount = ${keep.amount} AND currency = ${keep.currency}))
        `);
        updated++;
        console.log(`  → Updated to ID: ${newId}\n`);
      } catch (error) {
        console.log(`  → Note: Could not update ID (may already exist): ${newId}\n`);
      }
    }
  }

  console.log('\n========================================');
  console.log('Cleanup Complete!');
  console.log(`Total duplicates found: ${duplicatesFound}`);
  console.log(`Duplicates removed: ${cleaned}`);
  console.log(`Transactions updated with new IDs: ${updated}`);
  console.log('========================================');
}

cleanupDuplicates()
  .then(() => {
    console.log('\nMigration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
