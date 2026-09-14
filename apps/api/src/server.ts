import { serve } from '@hono/node-server';
import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { migrate } from './db/migrate.ts';
import { createPool } from './db/pool.ts';

// The only place that reads the environment, builds the pool and opens a socket.
const config = loadConfig();
const pool = createPool(config.databaseUrl);

await migrate(pool);

serve({ fetch: createApp({ pool, config }).fetch, port: config.port }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
