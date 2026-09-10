import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mock Next.js server-only guard for Vitest test environment.
      // In production Next.js builds, 'server-only' throws if imported from
      // a Client Component. In tests we replace it with an empty no-op module.
      'server-only': path.resolve(__dirname, './src/__mocks__/server-only.ts'),
    },
  },
});