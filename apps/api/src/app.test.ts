import { describe, expect, it } from 'vitest';
import { pool } from '../test/db.ts';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';

// Asserts only what stays true forever; feature modules own their own routes.test.ts.
describe('createApp', () => {
  const app = createApp({ pool, config: loadConfig({}) });

  it('serves GET /api/health', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
  });

  it('answers unknown routes with a 404 JSON { error }', async () => {
    const res = await app.request('/api/nope');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });
});
