// Проверка контента перед публикацией.
//   npm run content:check                         — весь контент
//   npm run content:check -- javascript/async      — только темы с этим id или префиксом
import path from 'node:path'
import { checkContent } from './content-check.mjs'

const only = process.argv[2]
const { errors, stats } = await checkContent(path.resolve(import.meta.dirname, '../content'), { only })

if (errors.length) {
  console.error(errors.map((error) => `✗ ${error}`).join('\n'))
  process.exitCode = 1
} else {
  const scope = only ? ` (${only})` : ''
  console.log(`✓ Контент в порядке${scope}: тем ${stats.leaves}, наполнено ${stats.filled}, карточек ${stats.cards}, заданий ${stats.practice}`)
}
