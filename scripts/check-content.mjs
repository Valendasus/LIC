// Проверка контента перед публикацией. Запуск: npm run content:check
import path from 'node:path'
import { checkContent } from './content-check.mjs'

const { errors, stats } = await checkContent(path.resolve(import.meta.dirname, '../content'))

if (errors.length) {
  console.error(errors.map((error) => `✗ ${error}`).join('\n'))
  process.exitCode = 1
} else {
  console.log(`✓ Контент в порядке: тем ${stats.leaves}, наполнено ${stats.filled}, карточек ${stats.cards}, заданий ${stats.practice}`)
}
