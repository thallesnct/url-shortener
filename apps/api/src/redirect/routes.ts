import { getConnInfo } from '@hono/node-server/conninfo';
import { type Context, Hono } from 'hono';
import { recordClick } from '../clicks/repo.ts';
import type { Deps } from '../deps.ts';

type LinkLookup = { id: number; original_url: string; expires_at: Date | null };

// First X-Forwarded-For entry when present (ADR redirect-301-tradeoff), else the socket
// address. getConnInfo dereferences the Node socket and throws under app.request(), where
// there is none; that case is recorded as NULL.
function clientIp(c: Context): string | null {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  try {
    return getConnInfo(c).remote.address ?? null;
  } catch {
    return null;
  }
}

export function redirectRoutes({ pool }: Deps) {
  // The route's own regex rejects anything but 7 alphanumerics, so bad codes never reach the
  // database and fall through to the global 404.
  return new Hono().get('/:code{[A-Za-z0-9]{7}}', async (c) => {
    // The lookup lives here rather than in links/ so the two modules stay independent.
    const { rows } = await pool.query<LinkLookup>(
      'SELECT id, original_url, expires_at FROM links WHERE code = $1',
      [c.req.param('code')],
    );
    const link = rows[0];
    if (!link) return c.notFound();
    if (link.expires_at && link.expires_at.getTime() <= Date.now()) {
      return c.json({ error: 'Link expired' }, 410);
    }

    await recordClick(pool, {
      linkId: link.id,
      referrer: c.req.header('referer') ?? null,
      userAgent: c.req.header('user-agent') ?? null,
      ip: clientIp(c),
    });
    return c.redirect(link.original_url, 301);
  });
}
