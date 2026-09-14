import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import type { Deps } from '../deps.ts';

export function webRoutes({ config }: Deps) {
  const app = new Hono();

  app.get('/analytics/*', serveStatic({ root: config.webDist, path: 'index.html' }));
  app.use('/*', serveStatic({ root: config.webDist }));

  return app;
}
