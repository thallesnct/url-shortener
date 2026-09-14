import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3000' },
      '^/[A-Za-z0-9]{7}$': { target: 'http://localhost:3000' },
    },
  },
  test: {
    environment: 'jsdom',
  },
});
