import type { Pool } from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { pool } from '../../test/db.ts';
import { type ClickRow, insertLink } from '../../test/fixtures.ts';
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';

const app = createApp({ pool, config: loadConfig({}) });
const CODE = 'abc1234';
const URL = 'https://example.com/page';

async function allClicks(): Promise<ClickRow[]> {
  const { rows } = await pool.query<ClickRow>(
    `SELECT id, link_id AS "linkId", referrer, user_agent AS "userAgent", ip,
            created_at AS "createdAt"
     FROM clicks`,
  );
  return rows;
}

describe('GET /:code', () => {
  it('AC1 redirects with 301 and Location = original URL for a link without expiry', async () => {
    await insertLink({ code: CODE, originalUrl: URL });
    const res = await app.request(`/${CODE}`);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe(URL);
  });

  it('AC2 answers 404 { error } for an unknown code and records no click', async () => {
    const res = await app.request('/zzzzzzz');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: expect.any(String) });
    expect(await allClicks()).toHaveLength(0);
  });

  it('AC3 answers 410 { error } for an expired link and records no click', async () => {
    await insertLink({ code: CODE, originalUrl: URL, expiresAt: new Date(Date.now() - 60_000) });
    const res = await app.request(`/${CODE}`);
    expect(res.status).toBe(410);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(await res.json()).toEqual({ error: expect.any(String) });
    expect(await allClicks()).toHaveLength(0);
  });

  it('AC3 still redirects a link that expires in the future', async () => {
    await insertLink({ code: CODE, originalUrl: URL, expiresAt: new Date(Date.now() + 60_000) });
    const res = await app.request(`/${CODE}`);
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe(URL);
  });

  it('AC4 records exactly one click with referrer, user agent and a fresh timestamp', async () => {
    const link = await insertLink({ code: CODE, originalUrl: URL });
    const before = Date.now();
    const res = await app.request(`/${CODE}`, {
      headers: { Referer: 'https://ref.example', 'User-Agent': 'test-agent/1.0' },
    });
    expect(res.status).toBe(301);

    const clicks = await allClicks();
    expect(clicks).toMatchObject([
      { linkId: link.id, referrer: 'https://ref.example', userAgent: 'test-agent/1.0' },
    ]);
    const createdAt = (clicks[0] as ClickRow).createdAt.getTime();
    expect(Math.abs(createdAt - before)).toBeLessThan(5_000);
  });

  it('AC4 stores NULL for absent Referer and User-Agent headers', async () => {
    await insertLink({ code: CODE, originalUrl: URL });
    const res = await app.request(`/${CODE}`);
    expect(res.status).toBe(301);

    const clicks = await allClicks();
    expect(clicks).toHaveLength(1);
    expect(clicks[0]).toMatchObject({ referrer: null, userAgent: null });
  });

  it('AC5 stores the first X-Forwarded-For entry as ip', async () => {
    await insertLink({ code: CODE, originalUrl: URL });
    const res = await app.request(`/${CODE}`, {
      headers: { 'X-Forwarded-For': '1.2.3.4, 10.0.0.1' },
    });
    expect(res.status).toBe(301);
    expect(await allClicks()).toMatchObject([{ ip: '1.2.3.4' }]);
  });

  it('AC5 falls back to the socket address when X-Forwarded-For is absent', async () => {
    await insertLink({ code: CODE, originalUrl: URL });
    // Mimic the env @hono/node-server hands to getConnInfo.
    const env = { incoming: { socket: { remoteAddress: '9.9.9.9', remoteFamily: 'IPv4' } } };
    const res = await app.request(`/${CODE}`, undefined, env);
    expect(res.status).toBe(301);
    expect(await allClicks()).toMatchObject([{ ip: '9.9.9.9' }]);
  });

  it('AC5 stores NULL ip when there is neither a proxy header nor a socket', async () => {
    await insertLink({ code: CODE, originalUrl: URL });
    const res = await app.request(`/${CODE}`);
    expect(res.status).toBe(301);
    expect(await allClicks()).toMatchObject([{ ip: null }]);
  });

  it('AC6 answers 404 without querying for a code that is not 7 alphanumerics', async () => {
    const query = vi.fn();
    const stubApp = createApp({ pool: { query } as unknown as Pool, config: loadConfig({}) });

    for (const path of ['/abc', '/abcdefgh', '/abc-123', '/abc_123', '/favicon.ico']) {
      const res = await stubApp.request(path);
      expect(res.status, path).toBe(404);
      expect(await res.json()).toEqual({ error: expect.any(String) });
    }
    expect(query).not.toHaveBeenCalled();
  });
});
