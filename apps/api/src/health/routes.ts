import { Hono } from 'hono';
import type { Deps } from '../deps.ts';

export function healthRoutes({ pool }: Deps) {
  return new Hono().get('/api/health', async (c) => {
    try {
      await pool.query('SELECT 1');
      return c.json({ status: 'ok', db: 'ok' });
    } catch {
      return c.json({ status: 'error', db: 'error' }, 503);
    }
  });
}
