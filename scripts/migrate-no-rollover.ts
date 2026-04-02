import { db } from '../lib/db';
import { categories } from '../lib/schema';
import { eq } from 'drizzle-orm';
import Database from 'better-sqlite3';
import path from 'path';

async function migrate() {
  console.log('Starting no-rollover migration...\n');

  try {
    // Step 1: Add no_rollover column if it doesn't exist
    console.log('Step 1: Checking if no_rollover column exists...');
    
    const dbPath = path.join(process.cwd(), 'data', 'finance.db');
    const sqlite = new Database(dbPath);
    const tableInfo = sqlite.prepare("PRAGMA table_info(categories)").all() as Array<{name: string}>;
    const hasNoRollover = tableInfo.some((col) => col.name === 'no_rollover');
    
    if (!hasNoRollover) {
      console.log('Adding no_rollover column to categories table...');
      sqlite.exec("ALTER TABLE categories ADD COLUMN no_rollover INTEGER DEFAULT 0");
      console.log('Column added successfully.\n');
    } else {
      console.log('Column already exists.\n');
    }
    sqlite.close();

    // Step 2: Set noRollover=true for Savings category if it exists
    console.log('Step 2: Checking for Savings category...');
    const allCategories = await db.query.categories.findMany();
    const savingsCategory = allCategories.find(cat => cat.name.toLowerCase() === 'savings');
    
    if (savingsCategory) {
      await db
        .update(categories)
        .set({ noRollover: true })
        .where(eq(categories.id, savingsCategory.id));
      console.log(`Set noRollover=true for Savings category`);
    } else {
      console.log('No Savings category found. Skipping auto-configuration.');
    }

    console.log('\nMigration complete!');
    
    // Show current state
    console.log('\nCurrent categories:');
    const updatedCategories = await db.query.categories.findMany();
    for (const cat of updatedCategories) {
      const noRollover = (cat as any).noRollover ? 'YES' : 'NO';
      console.log(`  ${cat.name}: noRollover=${noRollover}`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();