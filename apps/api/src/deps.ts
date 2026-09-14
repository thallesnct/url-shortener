import type { Pool } from 'pg';
import type { Config } from './config.ts';

// Everything a feature module may need. Injected through createApp(); never imported globally.
export type Deps = {
  pool: Pool;
  config: Config;
};
