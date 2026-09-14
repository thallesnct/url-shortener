import { Hono } from 'hono';
import type { Deps } from '../deps.ts';
import { type DayRow, fillDays, windowStart } from './fill-days.ts';

type LinkRow = { id: number; code: string; originalUrl: string };
type ReferrerRow = { referrer: string | null; clicks: number };

// `now` is injectable so the 30-day window is deterministic in tests; app.ts uses the default.
export function statsRoutes({ pool }: Deps, now: () => Date = () => new Date()) {
  return new Hono().get('/api/stats/:code', async (c) => {
    const { rows: links } = await pool.query<LinkRow>(
      'SELECT id, code, original_url AS "originalUrl" FROM links WHERE code = $1',
      [c.req.param('code')],
    );
    const link = links[0];
    if (!link) {
      return c.json({ error: 'Not found' }, 404);
    }

    const today = now();
    const [total, byDay, referrers] = await Promise.all([
      pool.query<{ total: number }>(
        'SELECT count(*)::int AS total FROM clicks WHERE link_id = $1',
        [link.id],
      ),
      pool.query<DayRow>(
        `SELECT to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
                count(*)::int AS clicks
         FROM clicks
         WHERE link_id = $1 AND created_at >= $2
         GROUP BY 1`,
        [link.id, windowStart(today)],
      ),
      pool.query<ReferrerRow>(
        `SELECT referrer, count(*)::int AS clicks
         FROM clicks
         WHERE link_id = $1
         GROUP BY referrer
         ORDER BY clicks DESC, referrer ASC NULLS LAST
         LIMIT 10`,
        [link.id],
      ),
    ]);

    return c.json({
      shortCode: link.code,
      originalUrl: link.originalUrl,
      totalClicks: total.rows[0]?.total ?? 0,
      clicksByDay: fillDays(byDay.rows, today),
      topReferrers: referrers.rows,
    });
  });
}
