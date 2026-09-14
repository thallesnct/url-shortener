import pg from 'pg';
import { describe, expect, it } from 'vitest';
import { pool } from '../../test/db.ts';
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';

describe('GET /api/health', () => {
  it('reports ok after a SELECT 1 on the injected pool', async () => {
    const app = createApp({ pool, config: loadConfig({}) });
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', db: 'ok' });
  });

  it('reports 503 when the database is unreachable', async () => {
    const deadPool = new pg.Pool({
      connectionString: 'postgres://nobody:nobody@127.0.0.1:1/nope',
      connectionTimeoutMillis: 500,
    });
    const app = createApp({ pool: deadPool, config: loadConfig({}) });
    const res = await app.request('/api/health');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ status: 'error', db: 'error' });
    await deadPool.end();
  });
});
