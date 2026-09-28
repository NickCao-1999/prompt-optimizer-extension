import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // 同时设置 maxWorkers 和 minWorkers
    maxWorkers: 1, 
    minWorkers: 1,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
});