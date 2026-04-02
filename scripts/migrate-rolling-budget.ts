import { db } from '../lib/db';
import { categories, categoryBudgets } from '../lib/schema';
import { eq, desc, sql } from 'drizzle-orm';
import Database from 'better-sqlite3';
import path from 'path';

async function migrate() {
  console.log('Starting rolling budget migration...\n');

  try {
    // Step 1: Add default_budget column if it doesn't exist
    console.log('Step 1: Checking if default_budget column exists...');
    
    // Use better-sqlite3 directly to check column info
    const dbPath = path.join(process.cwd(), 'data', 'finance.db');
    const sqlite = new Database(dbPath);
    const tableInfo = sqlite.prepare("PRAGMA table_info(categories)").all() as Array<{name: string}>;
    const hasDefaultBudget = tableInfo.some((col) => col.name === 'default_budget');
    
    if (!hasDefaultBudget) {
      console.log('Adding default_budget column to categories table...');
      sqlite.exec("ALTER TABLE categories ADD COLUMN default_budget REAL DEFAULT 0");
      console.log('Column added successfully.\n');
    } else {
      console.log('Column already exists.\n');
    }
    sqlite.close();

    // Step 2: Populate defaultBudget for categories that don't have it set
    console.log('Step 2: Populating defaultBudget values...');
    const allCategories = await db.query.categories.findMany();
    
    for (const category of allCategories) {
      // Skip if already has a default budget
      if ((category as any).defaultBudget > 0) {
        console.log(`Skipping ${category.name} - already has default budget: ${(category as any).defaultBudget}`);
        continue;
      }

      // Get the most recent budget for this category
      const latestBudget = await db.query.categoryBudgets.findFirst({
        where: eq(categoryBudgets.categoryId, category.id),
        orderBy: [desc(categoryBudgets.yearMonth)],
      });

      if (latestBudget && latestBudget.monthlyLimit > 0) {
        // Use the latest budget as the default
        await db
          .update(categories)
          .set({ defaultBudget: latestBudget.monthlyLimit })
          .where(eq(categories.id, category.id));
        console.log(`Set ${category.name} default budget to: ${latestBudget.monthlyLimit}`);
      } else {
        console.log(`No existing budget found for ${category.name}, keeping default of 0`);
      }
    }

    console.log('\nStep 3: Migration complete!');
    console.log(`\nSummary:`);
    console.log(`- Total categories: ${allCategories.length}`);
    console.log(`- Migration finished successfully`);
    
    // Step 4: Show current state
    console.log('\nCurrent category budgets:');
    const updatedCategories = await db.query.categories.findMany();
    for (const cat of updatedCategories) {
      console.log(`  ${cat.name}: ${(cat as any).defaultBudget || 0} MYR`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
