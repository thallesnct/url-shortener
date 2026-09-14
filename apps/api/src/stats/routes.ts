import { Hono } from 'hono';
import type { Deps } from '../deps.ts';

// Stub: stats routes are added by a later issue. Unmatched requests fall through to the 404.
export function statsRoutes(_deps: Deps) {
  return new Hono();
}
