import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/instrument.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'generated/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'src/_playground/**',
        '.conductor/**'
      ]
    },
    exclude: ['node_modules', 'dist', 'generated', '.conductor']
  },
  resolve: {
    alias: {
      // Handle Prisma generated client imports
      '../../generated/prisma/index.js': './generated/prisma/index.js',
      '../generated/prisma/index.js': './generated/prisma/index.js'
    }
  }
});
