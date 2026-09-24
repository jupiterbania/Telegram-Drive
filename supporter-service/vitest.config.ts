import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json-summary', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types.ts', 'src/*Html.ts'],
      thresholds: {
        statements: 5,
        branches: 5,
        functions: 10,
        lines: 5,
        'src/crypto.ts': {
          statements: 50,
          branches: 35,
          functions: 50,
          lines: 50,
        },
      },
    },
  },
});
