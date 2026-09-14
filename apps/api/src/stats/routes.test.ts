import { describe, expect, it } from 'vitest';
import { pool } from '../../test/db.ts';
import { insertClick, insertLink } from '../../test/fixtures.ts';
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';
import { statsRoutes } from './routes.ts';

const deps = { pool, config: loadConfig({}) };
const app = createApp(deps);

// Sub-app with a fixed clock so the 30-day window is deterministic.
const today = new Date('2026-09-14T12:00:00Z');
const frozenApp = statsRoutes(deps, { now: () => today });

const daysAgo = (n: number) => new Date(today.getTime() - n * 86_400_000);

type StatsBody = {
  shortCode: string;
  originalUrl: string;
  totalClicks: number;
  clicksByDay: Array<{ day: string; clicks: number }>;
  topReferrers: Array<{ referrer: string | null; clicks: number }>;
};
const stats = (res: Response) => res.json() as Promise<StatsBody>;

describe('GET /api/stats/:code', () => {
  it('AC1: returns 404 { error } for an unknown code', async () => {
    // Bare sub-app: no global notFound, so the handler itself must answer.
    const res = await frozenApp.request('/api/stats/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  it('AC2: returns zeroed stats for a link with no clicks', async () => {
    await insertLink({ code: 'abc123', originalUrl: 'https://example.com/page' });
    const res = await app.request('/api/stats/abc123');
    expect(res.status).toBe(200);
    const body = await stats(res);
    expect(body).toEqual({
      shortCode: 'abc123',
      originalUrl: 'https://example.com/page',
      totalClicks: 0,
      clicksByDay: expect.any(Array),
      topReferrers: [],
    });
    expect(body.clicksByDay).toHaveLength(30);
    expect(body.clicksByDay.every((d) => d.clicks === 0)).toBe(true);
  });

  it('AC3: clicksByDay covers exactly the last 30 UTC days ending today', async () => {
    const link = await insertLink({ code: 'win', originalUrl: 'https://example.com' });
    await insertClick({ linkId: link.id, createdAt: daysAgo(31) });
    await insertClick({ linkId: link.id, createdAt: daysAgo(29) });
    await insertClick({ linkId: link.id, createdAt: today });

    const res = await frozenApp.request('/api/stats/win');
    expect(res.status).toBe(200);
    const body = await stats(res);

    expect(body.clicksByDay).toHaveLength(30);
    expect(body.clicksByDay[0]).toEqual({ day: '2026-08-16', clicks: 1 });
    expect(body.clicksByDay[29]).toEqual({ day: '2026-09-14', clicks: 1 });
    const days = body.clicksByDay.map((d) => d.day);
    expect([...days].sort()).toEqual(days);
    expect(body.clicksByDay.reduce((sum, d) => sum + d.clicks, 0)).toBe(2);
    // AC5: totalClicks is not windowed.
    expect(body.totalClicks).toBe(3);
  });

  it('AC4: buckets days in UTC', async () => {
    const link = await insertLink({ code: 'utc', originalUrl: 'https://example.com' });
    await insertClick({ linkId: link.id, createdAt: new Date('2026-09-13T23:30:00Z') });
    await insertClick({ linkId: link.id, createdAt: new Date('2026-09-14T00:30:00Z') });

    const body = await stats(await frozenApp.request('/api/stats/utc'));
    expect(body.clicksByDay.slice(-2)).toEqual([
      { day: '2026-09-13', clicks: 1 },
      { day: '2026-09-14', clicks: 1 },
    ]);
  });

  it('AC5: topReferrers groups by referrer, descending, max 10, null grouped', async () => {
    const link = await insertLink({ code: 'ref', originalUrl: 'https://example.com' });
    const seed: Array<[string | null, number]> = [
      ['https://a.example', 4],
      [null, 3],
      ['https://b.example', 2],
      ...Array.from({ length: 9 }, (_, i): [string, number] => [`https://c${i}.example`, 1]),
    ];
    for (const [referrer, count] of seed) {
      for (let i = 0; i < count; i++) {
        await insertClick({ linkId: link.id, referrer, createdAt: daysAgo(i * 10) });
      }
    }

    const body = await stats(await app.request('/api/stats/ref'));
    expect(body.totalClicks).toBe(18);
    expect(body.topReferrers).toHaveLength(10);
    expect(body.topReferrers.slice(0, 3)).toEqual([
      { referrer: 'https://a.example', clicks: 4 },
      { referrer: null, clicks: 3 },
      { referrer: 'https://b.example', clicks: 2 },
    ]);
    expect(body.topReferrers.slice(3).every((r) => r.clicks === 1)).toBe(true);
  });

  it('AC6: an expired link still returns 200 stats', async () => {
    await insertLink({
      code: 'old',
      originalUrl: 'https://example.com',
      expiresAt: new Date('2020-01-01T00:00:00Z'),
    });
    const res = await app.request('/api/stats/old');
    expect(res.status).toBe(200);
    expect((await stats(res)).shortCode).toBe('old');
  });
});
