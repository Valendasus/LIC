// Заготовка новой темы (docs/LESSON-PLAYBOOK.md, шаг 2): три файла с метками TODO и отметка в дереве.
// В заготовку сразу попадают частые вопросы с собеседований, задачи соседних тем и источники из заметки исследования.
// Пока в файлах есть TODO, npm run content:check не проходит — недоделанная тема не попадёт в коммит.
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, parseDocument } from 'yaml'
import { NORMS } from './content-check.mjs'

const exists = (file) => access(file).then(() => true, () => false)
const today = (date) => `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
const comment = (lines) => lines.map((line) => (line ? `# ${line}` : '#')).join('\n')

/** Узел темы в YAML-дереве по пути из slug'ов. */
function findLeaf(seq, slugs) {
  const node = seq?.items?.find((item) => item.get('slug') === slugs[0])
  if (!node) return null
  return slugs.length === 1 ? node : findLeaf(node.get('children'), slugs.slice(1))
}

/** Ссылки из раздела «Источники» заметки исследования: «- Название — https://…» → «- [Название](https://…)». */
export function sourcesFromNote(note) {
  const section = note.split(/^## Источники\s*$/m)[1]?.split(/^## /m)[0] ?? ''
  return [...section.matchAll(/^- (.+?) — (https?:\/\/\S+)\s*$/gm)].map(([, title, url]) => `- [${title}](${url})`)
}

/** Задачи с кодом из соседних тем блока — чтобы не повторять их в новой теме. */
async function siblingTasks(dir, block, slugs) {
  const lines = []
  async function walk(nodes, parents) {
    for (const node of nodes ?? []) {
      const where = [...parents, node.slug]
      if (node.children) {
        await walk(node.children, where)
        continue
      }
      if (where.join('/') === slugs.join('/')) continue
      const text = await readFile(path.join(dir, ...where) + '.practice.yaml', 'utf8').catch(() => null)
      for (const item of text ? (parse(text) ?? []) : []) {
        if (['code', 'types', 'react'].includes(item.kind)) lines.push(`${where.slice(1).join('/')}: ${item.key} — ${item.title}`)
      }
    }
  }
  await walk(block.children, [block.slug])
  return lines
}

function lessonTemplate({ date, sources }) {
  return `export const meta = {
  verified: '${date}',
  versions: 'TODO: версии из заметки исследования',
}

## Learn

### Суть за минуту

TODO: 2–4 предложения, зачем тема, и один короткий пример.

### TODO: как устроено — первая идея

TODO: по одной идее на раздел, от механизма к применению. Новое понятие — до использования, у каждого утверждения — код.

### TODO: новое в последних версиях (если есть в заметке исследования)

TODO

<Example file="TODO: условный путь" verdict="good">

TODO: пример из реального кода, без названия проекта.

</Example>

<Callout type="deep">
TODO: спецификация и граничные случаи.
</Callout>

### Частые ошибки

| Ошибка | Признак | Исправление |
|---|---|---|
| TODO | | |

<Callout type="interview">
TODO: как отвечать сильно и что любят спрашивать.
</Callout>

## Implement

TODO: задания темы — компонентом Practice с ключом задания из practice.yaml. Задача «спроектировать» — в блоке Task с подсказками.

## Confirm

<Question q="TODO: вопрос">
TODO: ответ.
</Question>

## Источники

<Sources>

${sources.length ? sources.join('\n') : '- TODO: источники с датой проверки'}

</Sources>
`
}

function cardsTemplate({ title, grade }) {
  const norm = NORMS[grade] ?? NORMS.J
  return `# Карточки темы «${title}». Ключи не переименовывать.
${comment([
  `Норма для уровня ${grade ?? 'J'}: не меньше ${norm.cards} карточек.`,
  'Виды: term — термин (ключевым — reverse: true), qa — вопрос на понимание, code — «что не так» с кодом.',
])}

- key: todo-card
  type: term
  front: 'TODO: термин'
  back: 'TODO: определение'
`
}

function practiceTemplate({ title, grade, questions, siblings }) {
  const norm = NORMS[grade] ?? NORMS.J
  return `# Практика темы «${title}». Ответы в output проверяются запуском кода (npm run content:run).
${comment([
  `Норма для уровня ${grade ?? 'J'}: быстрых заданий не меньше ${norm.quick}, задач с кодом не меньше ${norm.tasks}.`,
  'Задачи разного типа: написать, починить, переписать. Подсказки лестницей: средней — от 2, сложной и боссу — от 3.',
  'В тестах задач доступны: test, expect, spy, sleep и помощники из docs/TRAINERS.md.',
  '',
  'Частые вопросы с собеседований по теме (docs/research/interview-questions.json) — на каждый нужен ответ в уроке и проверка:',
  ...(questions.length ? questions.map((question) => `  - ${question}`) : ['  (в исследовании вопросов по теме нет)']),
  '',
  'Задачи соседних тем блока — не повторять:',
  ...(siblings.length ? siblings.map((line) => `  - ${line}`) : ['  (пока нет)']),
])}

- key: todo-quiz
  kind: quiz
  question: 'TODO: вопрос'
  options:
    - text: 'TODO: верный вариант'
      correct: true
    - text: 'TODO: неверный вариант'
      why: 'TODO: почему неверный'
  explain: 'TODO: объяснение'
`
}

/**
 * Создаёт заготовку темы.
 * @param {{ contentRoot: string, docsRoot: string, id: string, now?: Date }} options
 *   id — «javascript/async/async-await» или «frontend/javascript/async/async-await»
 * @returns {Promise<{ topicId: string, files: string[], warnings: string[] }>}
 */
export async function scaffoldTopic({ contentRoot, docsRoot, id, now = new Date() }) {
  const specialties = parse(await readFile(path.join(contentRoot, 'specialties.yaml'), 'utf8'))
  const parts = id.split('/').filter(Boolean)
  const specialty = specialties.some((item) => item.slug === parts[0]) ? parts.shift() : 'frontend'
  const dir = path.join(contentRoot, specialty)
  const treeFile = path.join(dir, 'tree.yaml')
  const treeText = await readFile(treeFile, 'utf8')
  const doc = parseDocument(treeText)
  const where = parts.join('/')

  const leaf = findLeaf(doc.contents, parts)
  if (!leaf) throw new Error(`Темы «${where}» нет в дереве ${path.relative(contentRoot, treeFile)}`)
  if (leaf.get('children')) throw new Error(`«${where}» — раздел, а не тема: у него есть вложенные темы`)
  const base = path.join(dir, ...parts)
  const files = ['mdx', 'cards.yaml', 'practice.yaml'].map((ext) => `${base}.${ext}`)
  if (leaf.get('content') || (await Promise.all(files.map(exists))).some(Boolean)) throw new Error(`Тема «${where}» уже наполнена — правьте её файлы`)

  const title = leaf.get('title')
  const grade = leaf.get('grade')
  const warnings = []

  const noteFile = path.join(docsRoot, 'research', 'sources', parts[0], `${parts.at(-1)}.md`)
  const note = await readFile(noteFile, 'utf8').catch(() => null)
  if (note === null) warnings.push(`Нет заметки исследования ${path.relative(docsRoot, noteFile)} — сначала соберите её (шаг 1)`)
  const sources = note ? sourcesFromNote(note) : []

  const research = await readFile(path.join(docsRoot, 'research', 'interview-questions.json'), 'utf8').then(JSON.parse, () => null)
  const questions = (research?.leaves.find((item) => item.id === where)?.questions ?? []).slice(0, 15).map(([question]) => question)

  const blocks = parse(treeText)
  const siblings = await siblingTasks(dir, blocks.find((block) => block.slug === parts[0]), parts)

  await mkdir(path.dirname(base), { recursive: true })
  await writeFile(files[0], lessonTemplate({ date: today(now), sources }))
  await writeFile(files[1], cardsTemplate({ title, grade }))
  await writeFile(files[2], practiceTemplate({ title, grade, questions, siblings }))

  // Тема в дереве: блочная запись вместо однострочной, content: true и цели-заготовки.
  leaf.flow = false
  leaf.set('content', true)
  leaf.set('goals', doc.createNode(['TODO: цель — глагол «объяснить», «предсказать», «написать», «найти и исправить»']))
  await writeFile(treeFile, doc.toString({ lineWidth: 0 }))

  return { topicId: `${specialty}/${where}`, files: [...files, treeFile], warnings }
}
