import { db } from '../lib/db';
import { transactions, categories } from '../lib/schema';

async function resetDatabase() {
  console.log('Dropping all transactions...');
  await db.delete(transactions);
  
  console.log('Dropping all categories...');
  await db.delete(categories);
  
  console.log('Database reset complete. Run sync to re-fetch.');
  process.exit(0);
}

resetDatabase().catch(console.error);
