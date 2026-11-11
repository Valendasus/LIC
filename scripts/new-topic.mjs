// Заготовка новой темы: npm run new:topic -- javascript/async/async-await
import path from 'node:path'
import { scaffoldTopic } from './topic-scaffold.mjs'

const id = process.argv[2]
const root = path.resolve(import.meta.dirname, '..')

if (!id) {
  console.error('✗ Укажите тему: npm run new:topic -- javascript/async/async-await')
  process.exitCode = 1
} else {
  try {
    const { topicId, files, warnings } = await scaffoldTopic({ contentRoot: path.join(root, 'content'), docsRoot: path.join(root, 'docs'), id })
    console.log(`✓ Заготовка темы ${topicId}:\n${files.map((file) => `  ${path.relative(root, file)}`).join('\n')}`)
    for (const warning of warnings) console.log(`⚠ ${warning}`)
    console.log(`\nДальше — по docs/LESSON-PLAYBOOK.md. Проверка: npm run content:check -- ${topicId}`)
  } catch (error) {
    console.error(`✗ ${error.message}`)
    process.exitCode = 1
  }
}
