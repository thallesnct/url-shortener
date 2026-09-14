import { Hono } from 'hono';
import type { Deps } from '../deps.ts';

// Stub: links routes are added by a later issue. Unmatched requests fall through to the 404.
export function linksRoutes(_deps: Deps) {
  return new Hono();
}
