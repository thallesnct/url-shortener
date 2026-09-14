import { describe, expect, it } from 'vitest';
import { pool } from '../../test/db.ts';
import { insertLink } from '../../test/fixtures.ts';
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';
import { linksRoutes } from './routes.ts';

const config = loadConfig({});
const app = createApp({ pool, config });

const post = (target: ReturnType<typeof createApp>, body?: string) =>
  target.request('/api/shorten', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

const postJson = (body: unknown, target = app) => post(target, JSON.stringify(body));

type ShortenResponse = {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  createdAt: string;
  expiresAt: string | null;
};
const readBody = (res: Response) => res.json() as Promise<ShortenResponse>;

const selectLink = async (code: string) => {
  const { rows } = await pool.query(
    'SELECT code, original_url AS "originalUrl", expires_at AS "expiresAt" FROM links WHERE code = $1',
    [code],
  );
  return rows[0];
};

describe('POST /api/shorten', () => {
  it('AC1 creates a link and returns the contract with a 7-char code', async () => {
    const res = await postJson({ url: 'https://example.com/a?b=1' });
    expect(res.status).toBe(201);

    const body = await readBody(res);
    expect(body).toEqual({
      shortCode: expect.stringMatching(/^[A-Za-z0-9]{7}$/),
      shortUrl: `${config.baseUrl}/${body.shortCode}`,
      originalUrl: 'https://example.com/a?b=1',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      expiresAt: null,
    });

    expect(await selectLink(body.shortCode)).toEqual({
      code: body.shortCode,
      originalUrl: 'https://example.com/a?b=1',
      expiresAt: null,
    });
  });

  it('AC1 builds shortUrl without a double slash when BASE_URL has a trailing slash', async () => {
    const slashed = linksRoutes({ pool, config: { ...config, baseUrl: 'https://sho.rt/' } });
    const res = await postJson({ url: 'https://example.com' }, slashed);
    expect(res.status).toBe(201);
    const body = await readBody(res);
    expect(body.shortUrl).toBe(`https://sho.rt/${body.shortCode}`);
  });

  it.each([
    ['missing body', undefined],
    ['non-JSON body', '{not json'],
    ['url not a string', JSON.stringify({ url: 42 })],
    ['ftp scheme', JSON.stringify({ url: 'ftp://example.com' })],
    ['javascript scheme', JSON.stringify({ url: 'javascript:alert(1)' })],
    ['no scheme', JSON.stringify({ url: 'example.com' })],
    ['empty string', JSON.stringify({ url: '' })],
  ])('AC2 returns 400 { error } for %s', async (_label, body) => {
    const res = await post(app, body);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  it('AC3 echoes a future expiresAt as ISO UTC', async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const res = await postJson({ url: 'https://example.com', expiresAt: expiresAt.toISOString() });
    expect(res.status).toBe(201);
    const body = await readBody(res);
    expect(body.expiresAt).toBe(expiresAt.toISOString());
    expect((await selectLink(body.shortCode)).expiresAt).toEqual(expiresAt);
  });

  it.each([
    ['a past datetime', '2000-01-01T00:00:00Z'],
    ['a non-date string', 'next week'],
  ])('AC3 returns 400 for expiresAt that is %s', async (_label, expiresAt) => {
    const res = await postJson({ url: 'https://example.com', expiresAt });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: expect.any(String) });
  });

  it('AC5 retries with a new code when the generated one already exists', async () => {
    const codes = ['taken00', 'taken01', 'fresh02'];
    let calls = 0;
    const generateCode = () => codes[calls++] ?? 'unreach';
    const stubbed = linksRoutes({ pool, config }, { generateCode });

    await insertLink({ code: 'taken00', originalUrl: 'https://a.example' });
    await insertLink({ code: 'taken01', originalUrl: 'https://b.example' });

    const res = await postJson({ url: 'https://c.example' }, stubbed);
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ shortCode: 'fresh02' });
    expect(calls).toBe(3);
  });
});
