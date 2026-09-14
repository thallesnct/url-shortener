import type { Pool } from 'pg';
import pg from 'pg';
import type { CodeGenerator } from './code.ts';
import type { ShortenInput } from './validate.ts';

export type Link = {
  code: string;
  originalUrl: string;
  createdAt: Date;
  expiresAt: Date | null;
};

const UNIQUE_VIOLATION = '23505';
const MAX_ATTEMPTS = 5;

// Inserts with a freshly generated code, retrying on a code collision (links.code is UNIQUE).
export async function createLink(
  pool: Pool,
  input: ShortenInput,
  generateCode: CodeGenerator,
): Promise<Link> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await insertLink(pool, generateCode(), input);
    } catch (err) {
      const collision = err instanceof pg.DatabaseError && err.code === UNIQUE_VIOLATION;
      if (!collision || attempt === MAX_ATTEMPTS) throw err;
    }
  }
}

async function insertLink(pool: Pool, code: string, input: ShortenInput): Promise<Link> {
  const { rows } = await pool.query<Link>(
    `INSERT INTO links (code, original_url, expires_at)
     VALUES ($1, $2, $3)
     RETURNING code, original_url AS "originalUrl", created_at AS "createdAt",
               expires_at AS "expiresAt"`,
    [code, input.url, input.expiresAt],
  );
  return rows[0] as Link;
}
