import 'dotenv/config';
import { db } from '../lib/db';
import { transactions } from '../lib/schema';

async function wipe() {
  await db.delete(transactions);
  console.log('Transactions wiped');
  process.exit(0);
}

wipe().catch(e => { console.error(e); process.exit(1); });