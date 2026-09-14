import pg from 'pg';
import { inject } from 'vitest';

// One pool per test file (vitest isolates modules per file); test/setup.ts closes it.
export const pool = new pg.Pool({ connectionString: inject('databaseUrl') });

export async function truncateAll(): Promise<void> {
  await pool.query('TRUNCATE clicks, links RESTART IDENTITY CASCADE');
}
