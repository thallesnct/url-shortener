import pg from 'pg';

export function createPool(databaseUrl: string): pg.Pool {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  // An idle client losing its socket emits 'error' on the pool; unhandled, it would crash the
  // process. The client is discarded and the next query checks out a fresh one.
  pool.on('error', (err) => console.error('pg pool: idle client error', err));
  return pool;
}
