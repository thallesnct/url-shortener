import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.ts';

describe('loadConfig', () => {
  it('falls back to defaults matching docker-compose.yml when env is empty', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      baseUrl: 'http://localhost:3000',
      databaseUrl: 'postgres://shortener:shortener@localhost:5432/shortener',
    });
  });

  it('reads PORT, BASE_URL and DATABASE_URL from env', () => {
    expect(
      loadConfig({ PORT: '8080', BASE_URL: 'https://sho.rt', DATABASE_URL: 'postgres://x/y' }),
    ).toEqual({ port: 8080, baseUrl: 'https://sho.rt', databaseUrl: 'postgres://x/y' });
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(/PORT/);
  });
});
