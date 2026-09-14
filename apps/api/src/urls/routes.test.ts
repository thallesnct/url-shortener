import { describe, expect, it } from 'vitest';
import { pool } from '../../test/db.ts';
import { insertClick, insertLink } from '../../test/fixtures.ts';
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';

const app = createApp({ pool, config: loadConfig({ BASE_URL: 'https://sho.rt' }) });

type UrlItem = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
  clickCount: number;
};

async function listUrls(): Promise<UrlItem[]> {
  const res = await app.request('/api/urls');
  expect(res.status).toBe(200);
  return (await res.json()) as UrlItem[];
}

// insertLink has no createdAt input; pin timestamps directly so ordering is deterministic.
async function setCreatedAt(id: number, createdAt: Date): Promise<void> {
  await pool.query('UPDATE links SET created_at = $2 WHERE id = $1', [id, createdAt]);
}

describe('GET /api/urls', () => {
  it('AC1 returns an empty list when there are no links', async () => {
    expect(await listUrls()).toEqual([]);
  });

  it('AC2 lists links newest first with the full item shape', async () => {
    const oldest = await insertLink({ code: 'old', originalUrl: 'https://example.com/old' });
    const newest = await insertLink({ code: 'new', originalUrl: 'https://example.com/new' });
    const middle = await insertLink({ code: 'mid', originalUrl: 'https://example.com/mid' });
    await setCreatedAt(oldest.id, new Date('2026-09-01T00:00:00Z'));
    await setCreatedAt(middle.id, new Date('2026-09-02T00:00:00Z'));
    await setCreatedAt(newest.id, new Date('2026-09-03T00:00:00Z'));

    const body = await listUrls();
    expect(body.map((item) => item.shortCode)).toEqual(['new', 'mid', 'old']);
    expect(body[0]).toEqual({
      shortCode: 'new',
      shortUrl: 'https://sho.rt/new',
      originalUrl: 'https://example.com/new',
      createdAt: '2026-09-03T00:00:00.000Z',
      expiresAt: null,
      clickCount: 0,
    });
  });

  it('AC3 counts only the clicks that belong to each link', async () => {
    const clicked = await insertLink({ code: 'abc', originalUrl: 'https://example.com/a' });
    const untouched = await insertLink({ code: 'xyz', originalUrl: 'https://example.com/b' });
    await insertClick({ linkId: clicked.id });
    await insertClick({ linkId: clicked.id, referrer: 'https://ref.example' });
    await insertClick({ linkId: clicked.id });

    const body = await listUrls();
    const byCode = Object.fromEntries(body.map((item) => [item.shortCode, item.clickCount]));
    expect(byCode).toEqual({ [clicked.code]: 3, [untouched.code]: 0 });
  });

  it('AC4 builds shortUrl from config.baseUrl and serialises expiresAt as ISO UTC', async () => {
    const expiresAt = new Date('2027-01-01T12:34:56.000Z');
    await insertLink({ code: 'exp', originalUrl: 'https://example.com/e', expiresAt });

    const body = await listUrls();
    expect(body).toHaveLength(1);
    expect(body[0]?.shortUrl).toBe('https://sho.rt/exp');
    expect(body[0]?.expiresAt).toBe('2027-01-01T12:34:56.000Z');
  });
});
