import { afterAll, beforeEach } from 'vitest';
import { pool, truncateAll } from './db.ts';

beforeEach(truncateAll);
afterAll(() => pool.end());
