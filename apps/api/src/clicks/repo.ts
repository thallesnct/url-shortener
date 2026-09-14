import type { Pool } from 'pg';

export type NewClick = {
  linkId: number;
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
};

// One row per successful redirect; created_at defaults to now() in the schema.
export async function recordClick(pool: Pool, click: NewClick): Promise<void> {
  await pool.query(
    'INSERT INTO clicks (link_id, referrer, user_agent, ip) VALUES ($1, $2, $3, $4)',
    [click.linkId, click.referrer, click.userAgent, click.ip],
  );
}
