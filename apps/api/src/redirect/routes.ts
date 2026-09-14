import { Hono } from 'hono';
import type { Deps } from '../deps.ts';

// Stub: redirect routes are added by a later issue. Unmatched requests fall through to the 404.
export function redirectRoutes(_deps: Deps) {
  return new Hono();
}
