// Запуск фрагмента кода в той же песочнице, где проверяются ответы «что выведет».
//   npm run content:run -- файл.js
//   echo "console.log(1)" | npm run content:run
import { readFile } from 'node:fs/promises'
import { text } from 'node:stream/consumers'
import { runOutput } from './content-check.mjs'

const file = process.argv[2]
const code = file ? await readFile(file, 'utf8') : await text(process.stdin)
try {
  const lines = await runOutput(code)
  console.log(lines.length ? lines.join('\n') : '(ничего не выведено)')
  // Готовая строка для answer в practice.yaml.
  console.log(`\nanswer: ${JSON.stringify(lines)}`)
} catch (error) {
  console.error(`✗ Код упал: ${error.message}`)
  process.exitCode = 1
}
