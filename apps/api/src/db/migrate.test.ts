import { describe, expect, it } from 'vitest';
import { pool } from '../../test/db.ts';
import { migrate } from './migrate.ts';

describe('migrate', () => {
  it('is idempotent: applying again, even concurrently, records one row per file', async () => {
    await migrate(pool);
    await Promise.all([migrate(pool), migrate(pool)]);

    const { rows } = await pool.query<{ name: string; n: string }>(
      'SELECT name, count(*)::text AS n FROM schema_migrations GROUP BY name ORDER BY name',
    );
    expect(rows).toEqual([{ name: '0001_init.sql', n: '1' }]);
  });

  it('0001_init creates links, clicks and the clicks(link_id, created_at) index', async () => {
    const columns = async (table: string) => {
      const { rows } = await pool.query<{ column_name: string }>(
        'SELECT column_name FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position',
        [table],
      );
      return rows.map((r) => r.column_name);
    };
    expect(await columns('links')).toEqual([
      'id',
      'code',
      'original_url',
      'created_at',
      'expires_at',
    ]);
    expect(await columns('clicks')).toEqual([
      'id',
      'link_id',
      'referrer',
      'user_agent',
      'ip',
      'created_at',
    ]);

    const { rows: indexes } = await pool.query<{ indexdef: string }>(
      "SELECT indexdef FROM pg_indexes WHERE tablename = 'clicks'",
    );
    expect(indexes.map((r) => r.indexdef)).toContainEqual(
      expect.stringMatching(/ON public\.clicks USING btree \(link_id, created_at\)/),
    );
  });

  it('enforces links.code uniqueness and the clicks.link_id foreign key', async () => {
    await pool.query(
      "INSERT INTO links (code, original_url) VALUES ('abc1234', 'https://a.example')",
    );
    await expect(
      pool.query("INSERT INTO links (code, original_url) VALUES ('abc1234', 'https://b.example')"),
    ).rejects.toThrow(/unique/i);
    await expect(pool.query('INSERT INTO clicks (link_id) VALUES (999999)')).rejects.toThrow(
      /foreign key/i,
    );
  });
});
