import path from 'node:path'
import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import remarkGfm from 'remark-gfm'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Как в Next.js: компоненты уроков (Callout, Task, h3…) берутся из src/mdx-components.tsx.
  plugins: [{ enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm], providerImportSource: '@/mdx-components' }) }, react()],
  resolve: {
    alias: {
      // Тестовая специальность demo живёт в test/fixtures/content; алиас идёт раньше общего, поэтому побеждает.
      '@content/demo': path.resolve(import.meta.dirname, 'test/fixtures/content/demo'),
      '@content': path.resolve(import.meta.dirname, 'content'),
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  // Next.js собирает импорт MDX по шаблону с вложенными путями, а у Vite такой шаблон ограничен одним уровнем.
  // В тестах импорт остаётся динамическим и разрешается во время выполнения через алиас @content.
  build: { dynamicImportVarsOptions: { exclude: [/.*/] } },
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    environment: 'node',
    // Интеграционные тесты делят одну тестовую базу lic_test, поэтому файлы идут по очереди.
    fileParallelism: false,
    env: { DATABASE_URL: 'postgres://lic:lic@localhost:5433/lic_test' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
      reporter: ['text', 'html'],
      thresholds: { 100: true },
    },
  },
})
