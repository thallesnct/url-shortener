import { describe, expect, it } from 'vitest';
import { parseShortenBody } from './validate.ts';

const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();

describe('parseShortenBody', () => {
  it('accepts an http(s) url and returns expiresAt null when absent', () => {
    expect(parseShortenBody({ url: 'https://example.com/a?b=1' })).toEqual({
      ok: true,
      value: { url: 'https://example.com/a?b=1', expiresAt: null },
    });
    expect(parseShortenBody({ url: 'http://example.com' })).toMatchObject({ ok: true });
  });

  it('stores the normalised href so control characters never reach the database', () => {
    expect(parseShortenBody({ url: 'https://exa\nmple.com/x' })).toMatchObject({
      ok: true,
      value: { url: 'https://example.com/x' },
    });
  });

  it.each([
    ['missing body', undefined],
    ['null body', null],
    ['non-object body', 'https://example.com'],
    ['missing url', {}],
    ['url not a string', { url: 42 }],
    ['ftp scheme', { url: 'ftp://example.com/file' }],
    ['javascript scheme', { url: 'javascript:alert(1)' }],
    ['no scheme', { url: 'example.com' }],
    ['empty string', { url: '' }],
    ['url longer than 2048 chars', { url: `https://example.com/${'a'.repeat(2048)}` }],
  ])('rejects %s', (_label, body) => {
    expect(parseShortenBody(body)).toEqual({ ok: false, error: expect.any(String) });
  });

  it('accepts a future ISO datetime as expiresAt and parses it to a Date', () => {
    const result = parseShortenBody({ url: 'https://example.com', expiresAt: future });
    expect(result).toEqual({
      ok: true,
      value: { url: 'https://example.com/', expiresAt: new Date(future) },
    });
  });

  it('interprets an offset-less ISO datetime as UTC', () => {
    expect(
      parseShortenBody({ url: 'https://example.com', expiresAt: '2030-06-01T12:00:00' }),
    ).toMatchObject({ ok: true, value: { expiresAt: new Date('2030-06-01T12:00:00Z') } });
  });

  it('accepts ISO datetimes with a numeric offset or without seconds', () => {
    for (const expiresAt of ['2030-06-01T12:00:00+02:00', '2030-06-01T12:00Z']) {
      expect(parseShortenBody({ url: 'https://example.com', expiresAt })).toMatchObject({
        ok: true,
        value: { expiresAt: new Date(expiresAt) },
      });
    }
  });

  it.each([
    ['a past datetime', '2000-01-01T00:00:00Z'],
    ['a non-date string', 'tomorrow'],
    ['a non-ISO date', '12/25/2030'],
    ['a date without a time', '2030-06-01'],
    ['a non-string', 12345],
  ])('rejects expiresAt that is %s', (_label, expiresAt) => {
    expect(parseShortenBody({ url: 'https://example.com', expiresAt })).toEqual({
      ok: false,
      error: expect.any(String),
    });
  });
});
