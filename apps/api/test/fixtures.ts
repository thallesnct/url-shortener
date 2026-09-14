import { pool } from './db.ts';

// Raw-SQL seed helpers shared by every module's tests. Return the inserted row in camelCase.

export type LinkRow = {
  id: number;
  code: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
};

export type ClickRow = {
  id: number;
  linkId: number;
  referrer: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
};

export async function insertLink(input: {
  code: string;
  originalUrl: string;
  expiresAt?: Date | null;
}): Promise<LinkRow> {
  const { rows } = await pool.query<LinkRow>(
    `INSERT INTO links (code, original_url, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, code, original_url AS "originalUrl", created_at AS "createdAt",
               expires_at AS "expiresAt"`,
    [input.code, input.originalUrl, input.expiresAt ?? null],
  );
  return rows[0] as LinkRow;
}

export async function insertClick(input: {
  linkId: number;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  createdAt?: Date;
}): Promise<ClickRow> {
  const { rows } = await pool.query<ClickRow>(
    `INSERT INTO clicks (link_id, referrer, user_agent, ip, created_at)
     VALUES ($1, $2, $3, $4, COALESCE($5, now()))
     RETURNING id, link_id AS "linkId", referrer, user_agent AS "userAgent", ip,
               created_at AS "createdAt"`,
    [
      input.linkId,
      input.referrer ?? null,
      input.userAgent ?? null,
      input.ip ?? null,
      input.createdAt ?? null,
    ],
  );
  return rows[0] as ClickRow;
}
