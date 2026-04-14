import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const client = await pool.connect();

const queries = [
  `CREATE INDEX CONCURRENTLY idx_transactions_user_date_type ON transactions (user_id, date, type)`,
  `CREATE INDEX CONCURRENTLY idx_transactions_user_date_category ON transactions (user_id, date, category)`,
  `CREATE INDEX CONCURRENTLY idx_transactions_user_category ON transactions (user_id, category)`,
];

for (const q of queries) {
  try {
    await client.query(q);
    console.log(`✓ Created: ${q.split(' ON ')[0].replace('CREATE INDEX CONCURRENTLY ', '')}`);
  } catch (err: any) {
    if (err.code === '42P11') {
      console.log(`⏭ Already exists: ${q.split(' ON ')[0].replace('CREATE INDEX CONCURRENTLY ', '')}`);
    } else {
      throw err;
    }
  }
}

client.release();
await pool.end();
