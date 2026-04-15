import 'dotenv/config';
import { db } from '../lib/db.js';
import { users } from '../lib/schema.js';
import { hashPassword } from '../lib/auth/password.js';
import { randomUUID } from 'crypto';

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: npx tsx scripts/create-user.ts <username> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const id = randomUUID();

  try {
    await db.insert(users).values({
      id,
      username,
      passwordHash,
      role: 'user',
      createdAt: new Date(),
    });
    console.log(`User created: ${username} (id: ${id})`);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
      console.error(`Username '${username}' already exists`);
      process.exit(1);
    }
    throw error;
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create user:', err);
  process.exit(1);
});
