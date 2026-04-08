import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Note: Production deployments may want to configure pool size via environment variables
const connectionString = process.env.DATABASE_URL ?? (() => { throw new Error('DATABASE_URL environment variable is required'); })();

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export function initDb() {
  // Tables are created via Drizzle migrations (drizzle-kit push)
  // This function is kept for backwards compatibility
}