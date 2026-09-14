import { describe, expect, it } from 'vitest';
import { pool, truncateAll } from './db.ts';
import { insertClick, insertLink } from './fixtures.ts';

const count = async (table: 'links' | 'clicks') => {
  const { rows } = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`);
  return Number(rows[0]?.n);
};

describe('test fixtures', () => {
  it('insertLink and insertClick write rows with defaults and explicit values', async () => {
    const link = await insertLink({ code: 'abc1234', originalUrl: 'https://example.com' });
    expect(link).toMatchObject({
      code: 'abc1234',
      originalUrl: 'https://example.com',
      expiresAt: null,
    });
    expect(link.createdAt).toBeInstanceOf(Date);

    const expires = new Date('2030-01-01T00:00:00Z');
    const expiring = await insertLink({
      code: 'zzz9999',
      originalUrl: 'https://e.com',
      expiresAt: expires,
    });
    expect(expiring.expiresAt).toEqual(expires);

    const at = new Date('2026-09-01T12:00:00Z');
    const click = await insertClick({
      linkId: link.id,
      referrer: 'https://ref.example',
      createdAt: at,
    });
    expect(click).toMatchObject({
      linkId: link.id,
      referrer: 'https://ref.example',
      userAgent: null,
      ip: null,
    });
    expect(click.createdAt).toEqual(at);

    await insertClick({ linkId: link.id });
    expect(await count('links')).toBe(2);
    expect(await count('clicks')).toBe(2);
  });

  it('truncateAll empties both tables', async () => {
    const link = await insertLink({ code: 'abc1234', originalUrl: 'https://example.com' });
    await insertClick({ linkId: link.id });

    await truncateAll();

    expect(await count('links')).toBe(0);
    expect(await count('clicks')).toBe(0);
  });
});
