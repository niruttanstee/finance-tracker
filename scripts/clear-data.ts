import { db } from '../lib/db.js';
import { transactions, users } from '../lib/schema.js';
import { hashPassword } from '../lib/auth/password.js';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Clearing transactions and resetting admin user...\n');

  // 1. Clear all transactions
  console.log('1. Deleting all transactions...');
  await db.delete(transactions);
  console.log('   Transactions cleared.\n');

  // 2. Find and update admin user
  console.log('2. Finding admin user...');
  const adminUsers = await db.select().from(users).where(eq(users.role, 'superuser'));

  if (adminUsers.length === 0) {
    console.log('   No superuser found. Creating new user "nirutt"...');
    const passwordHash = await hashPassword('energy2468');
    const { randomUUID } = await import('crypto');
    await db.insert(users).values({
      id: randomUUID(),
      username: 'nirutt',
      passwordHash,
      role: 'superuser',
      createdAt: new Date(),
    });
    console.log('   User "nirutt" created with password "energy2468"\n');
  } else {
    const admin = adminUsers[0];
    console.log(`   Found admin user: ${admin.username} (id: ${admin.id})`);
    console.log('   Updating username to "nirutt" and password to "energy2468"...');

    const passwordHash = await hashPassword('energy2468');
    await db.update(users)
      .set({ username: 'nirutt', passwordHash })
      .where(eq(users.id, admin.id));

    console.log('   Admin renamed to "nirutt" with new password.\n');
  }

  // 3. Verify
  console.log('3. Verification:');
  const nirutt = await db.select().from(users).where(eq(users.username, 'nirutt'));
  if (nirutt.length > 0) {
    console.log(`   User "nirutt" exists with role: ${nirutt[0].role}`);
  }

  const txCount = await db.select({ count: transactions.id }).from(transactions);
  console.log(`   Transaction count: ${txCount.length}`);

  console.log('\nDone!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});