export type Config = {
  port: number;
  baseUrl: string;
  databaseUrl: string;
  webDist: string;
};

// Defaults match docker-compose.yml so a clean clone runs without a .env file.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const port = Number(env.PORT ?? '3000');
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`PORT must be a positive integer, got "${env.PORT}"`);
  }
  return {
    port,
    baseUrl: env.BASE_URL ?? `http://localhost:${port}`,
    databaseUrl: env.DATABASE_URL ?? 'postgres://shortener:shortener@localhost:5432/shortener',
    webDist: env.WEB_DIST ?? '../web/dist',
  };
}
