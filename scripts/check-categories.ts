import 'dotenv/config';
import { db } from '../lib/db.js';
import { categories } from '../lib/schema.js';
import { sql } from 'drizzle-orm';

async function main() {
  const all = await db.select().from(categories).orderBy(sql`user_id`);
  console.log(JSON.stringify(all, null, 2));
}

main();