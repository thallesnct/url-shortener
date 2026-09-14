import { Hono } from 'hono';
import type { Deps } from '../deps.ts';

type UrlRow = {
  shortCode: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
  clickCount: number;
};

// Every link, newest first, with its click count. COUNT(clicks.id) (not COUNT(*)) so a link
// without clicks counts 0 through the LEFT JOIN; ::int because pg returns bigint as a string.
const LIST_URLS = `
  SELECT links.code        AS "shortCode",
         links.original_url AS "originalUrl",
         links.created_at   AS "createdAt",
         links.expires_at   AS "expiresAt",
         COUNT(clicks.id)::int AS "clickCount"
  FROM links
  LEFT JOIN clicks ON clicks.link_id = links.id
  GROUP BY links.id
  ORDER BY links.created_at DESC, links.id DESC`;

export function urlsRoutes({ pool, config }: Deps) {
  return new Hono().get('/api/urls', async (c) => {
    const { rows } = await pool.query<UrlRow>(LIST_URLS);
    return c.json(
      rows.map(({ shortCode, ...rest }) => ({
        shortCode,
        shortUrl: `${config.baseUrl}/${shortCode}`,
        ...rest,
      })),
    );
  });
}
