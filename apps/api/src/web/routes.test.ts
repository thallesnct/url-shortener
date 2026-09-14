import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Pool } from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app.ts';
import { loadConfig } from '../config.ts';

describe('web routes', () => {
  let dist: string;

  beforeEach(async () => {
    dist = await mkdtemp(join(tmpdir(), 'url-shortener-web-'));
    await mkdir(join(dist, 'assets'));
    await mkdir(join(dist, 'analytics'));
    await writeFile(join(dist, 'index.html'), '<!doctype html><title>Analytics</title>');
    await writeFile(join(dist, 'assets', 'app.js'), 'console.log("web fixture")');
    await writeFile(join(dist, 'analytics', 'abc1234'), 'route-specific file');
  });

  afterEach(async () => {
    await rm(dist, { recursive: true, force: true });
  });

  it('serves the SPA shell for analytics routes', async () => {
    const app = createApp({
      pool: { query: vi.fn() } as unknown as Pool,
      config: loadConfig({ WEB_DIST: dist }),
    });

    const response = await app.request('/analytics/abc1234');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/text\/html/);
    expect(await response.text()).toContain('<title>Analytics</title>');
  });

  it('serves files from the configured web dist directory', async () => {
    const app = createApp({
      pool: { query: vi.fn() } as unknown as Pool,
      config: loadConfig({ WEB_DIST: dist }),
    });

    const response = await app.request('/assets/app.js');

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/javascript/);
    expect(await response.text()).toContain('web fixture');
  });

  it('leaves API and short-code routes unaffected', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const app = createApp({
      pool: { query } as unknown as Pool,
      config: loadConfig({ WEB_DIST: dist }),
    });

    expect((await app.request('/api/health')).status).toBe(200);
    expect((await app.request('/abc1234')).status).toBe(404);
    expect(query).toHaveBeenCalledWith(expect.stringContaining('FROM links'), ['abc1234']);
  });
});
