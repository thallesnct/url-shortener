import { PostgreSqlContainer } from '@testcontainers/postgresql';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { migrate } from '../src/db/migrate.ts';

declare module 'vitest' {
  interface ProvidedContext {
    databaseUrl: string;
  }
}

// Starts one Postgres for the whole run, applies migrations once and hands the URL to workers.
export default async function setup({ provide }: TestProject) {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const databaseUrl = container.getConnectionUri();

  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await migrate(pool);
  } finally {
    await pool.end();
  }

  provide('databaseUrl', databaseUrl);
  return async () => {
    await container.stop();
  };
}
