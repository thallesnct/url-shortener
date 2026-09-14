import { Hono } from 'hono';
import type { Deps } from './deps.ts';
import { healthRoutes } from './health/routes.ts';
import { linksRoutes } from './links/routes.ts';
import { redirectRoutes } from './redirect/routes.ts';
import { statsRoutes } from './stats/routes.ts';
import { urlsRoutes } from './urls/routes.ts';
import { webRoutes } from './web/routes.ts';

// Route registry. Sub-apps declare absolute paths and are mounted in this fixed order;
// redirect (`/:code`) is the catch-all and must stay last. Feature issues never edit this file.
export function createApp(deps: Deps) {
  const app = new Hono();

  app.route('/', healthRoutes(deps));
  app.route('/', linksRoutes(deps));
  app.route('/', urlsRoutes(deps));
  app.route('/', statsRoutes(deps));
  app.route('/', webRoutes(deps));
  app.route('/', redirectRoutes(deps));

  app.notFound((c) => c.json({ error: 'Not found' }, 404));
  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}
