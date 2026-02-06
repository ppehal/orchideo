import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/triggers/**/*.ts',
        'src/lib/integrations/facebook/**/*.ts',
        'src/lib/services/analysis/**/*.ts',
      ],
      exclude: ['src/lib/triggers/**/index.ts', '**/*.d.ts', '**/types.ts', '**/index.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
