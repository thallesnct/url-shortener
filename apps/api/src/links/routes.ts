import { Hono } from 'hono';
import type { Deps } from '../deps.ts';
import { type CodeGenerator, generateCode } from './code.ts';
import { createLink } from './repo.ts';
import { parseShortenBody } from './validate.ts';

// The generator is injectable so tests can force a code collision (see routes.test.ts).
export function linksRoutes(
  { pool, config }: Deps,
  options: { generateCode?: CodeGenerator } = {},
) {
  const generate = options.generateCode ?? generateCode;
  const baseUrl = config.baseUrl.replace(/\/+$/, '');

  return new Hono().post('/api/shorten', async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Body must be valid JSON' }, 400);
    }

    const parsed = parseShortenBody(body);
    if (!parsed.ok) return c.json({ error: parsed.error }, 400);

    const link = await createLink(pool, parsed.value, generate);
    return c.json(
      {
        shortCode: link.code,
        shortUrl: `${baseUrl}/${link.code}`,
        originalUrl: link.originalUrl,
        createdAt: link.createdAt.toISOString(),
        expiresAt: link.expiresAt?.toISOString() ?? null,
      },
      201,
    );
  });
}
