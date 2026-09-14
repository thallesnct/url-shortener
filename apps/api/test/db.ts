import { inject } from 'vitest';
import { createPool } from '../src/db/pool.ts';

// One pool per test file (vitest isolates modules per file); test/setup.ts closes it.
export const pool = createPool(inject('databaseUrl'));

export async function truncateAll(): Promise<void> {
  await pool.query('TRUNCATE clicks, links RESTART IDENTITY CASCADE');
}
