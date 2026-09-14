import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['test/global-setup.ts'],
    setupFiles: ['test/setup.ts'],
    // All API test files share one Postgres and truncate between tests.
    fileParallelism: false,
    hookTimeout: 120_000,
  },
});
