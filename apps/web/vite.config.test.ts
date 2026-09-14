import { describe, expect, it } from 'vitest';
import config from './vite.config.ts';

describe('Vite proxy', () => {
  it('proxies only API requests and seven-character short codes to the API', () => {
    expect(config).toMatchObject({
      server: {
        proxy: {
          '/api': { target: 'http://localhost:3000' },
          '^/[A-Za-z0-9]{7}$': { target: 'http://localhost:3000' },
        },
      },
    });

    expect(Object.keys(config.server?.proxy ?? {})).toEqual(['/api', '^/[A-Za-z0-9]{7}$']);
  });
});
