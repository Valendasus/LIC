// Проверка контента платформы. Используется CLI scripts/check-content.mjs и тестами.
// Проверяет: дерево корректно, у каждой темы с content: true есть файл, карточки и задания
// оформлены правильно, ответы «что выведет» совпадают с реальным выводом кода,
// эталоны задач на код проходят свои тесты, а заготовки — нет,
// наполненные темы соблюдают нормы состава (docs/LESSON-PLAYBOOK.md) и не содержат меток TODO,
// ссылки <Practice id="…" /> в уроках ведут на существующие задания,
// и нет «осиротевших» файлов, которых нет в дереве.
import { readFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { parse } from 'yaml'
// Тот же модуль, что запускает тесты в браузере: эталон проверяется ровно так, как решение ученика.
import { isSolved, runCode } from '../src/features/solve-task/lib/code-runner.ts'
import { compileReact } from '../src/features/solve-task/lib/react-compile.ts'
import { checkTypes, collectLibs } from '../src/features/solve-task/lib/type-checker.ts'
import ts from 'ts6'

const CARD_TYPES = ['term', 'qa', 'code']
const PRACTICE_KINDS = ['quiz', 'output', 'order', 'code', 'types', 'react']
const TASK_KINDS = ['code', 'types', 'react']
const TASK_LEVELS = ['warmup', 'easy', 'medium', 'hard', 'boss']
/** Сложным задачам нужна полная лестница подсказок. */
const MIN_HINTS = { warmup: 0, easy: 1, medium: 2, hard: 3, boss: 3 }
const KEY = /^[a-z0-9-]+$/
const QUICK_KINDS = ['quiz', 'output', 'order']

/**
 * Нормы состава наполненной темы по уровню (docs/LESSON-PLAYBOOK.md, часть 2): минимум карточек,
 * быстрых заданий (квиз, «что выведет», порядок) и задач с редактором.
 */
export const NORMS = {
  J: { cards: 12, quick: 10, tasks: 4 },
  M: { cards: 10, quick: 8, tasks: 4 },
  S: { cards: 8, quick: 6, tasks: 3 },
}

/** Метка незаполненного места в заготовке темы (npm run new:topic). */
const TODO = /\bTODO\b/g
const countTodo = (text) => (text.match(TODO) ?? []).length

/** Выполняет код задачи «что выведет» и возвращает реальный вывод console.log построчно. */
export async function runOutput(code) {
  const lines = []
  const sandbox = {
    console: { log: (...args) => lines.push(args.map(String).join(' ')) },
    setTimeout,
    clearTimeout,
    queueMicrotask,
    Promise,
    // Отмена — часть браузерного окружения, задания про AbortController должны запускаться как у ученика.
    AbortController,
    AbortSignal,
    DOMException,
  }
  vm.runInNewContext(code, sandbox, { timeout: 1000 })
  await new Promise((resolve) => setTimeout(resolve, 100))
  return lines
}

async function listContentFiles(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await listContentFiles(full)))
    else if (/\.(mdx|cards\.yaml|practice\.yaml)$/.test(entry.name)) out.push(full)
  }
  return out
}

function parseYaml(text, label, errors) {
  try {
    return parse(text) ?? []
  } catch (error) {
    errors.push(`${label}: ошибка YAML — ${error.message.split('\n')[0]}`)
    return []
  }
}

function checkCards(cards, where, keys, errors) {
  let count = 0
  for (const [index, card] of cards.entries()) {
    const label = `${where}.cards.yaml #${index + 1}`
    if (!card.key || !KEY.test(card.key)) errors.push(`${label}: key из латиницы, цифр и дефисов`)
    if (keys.has(card.key)) errors.push(`${label}: повторяется key «${card.key}»`)
    keys.add(card.key)
    if (!CARD_TYPES.includes(card.type)) errors.push(`${label}: type должен быть ${CARD_TYPES.join(', ')}`)
    if (typeof card.front !== 'string' || !card.front.trim()) errors.push(`${label}: пустой front`)
    if (typeof card.back !== 'string' || !card.back.trim()) errors.push(`${label}: пустой back`)
    if (card.reverse && card.type !== 'term') errors.push(`${label}: reverse бывает только у term`)
    count += card.reverse ? 2 : 1
  }
  return count
}

async function checkPractice(items, where, keys, errors) {
  for (const [index, item] of items.entries()) {
    const label = `${where}.practice.yaml #${index + 1} (${item.key ?? 'без ключа'})`
    if (!item.key || !KEY.test(item.key)) errors.push(`${label}: key из латиницы, цифр и дефисов`)
    if (keys.has(item.key)) errors.push(`${label}: key «${item.key}» уже занят в этой теме`)
    keys.add(item.key)
    if (!PRACTICE_KINDS.includes(item.kind)) errors.push(`${label}: kind должен быть ${PRACTICE_KINDS.join(', ')}`)
    if (typeof item.explain !== 'string' || !item.explain.trim()) errors.push(`${label}: нет explain`)
    if (item.kind === 'quiz') {
      if (!item.question) errors.push(`${label}: нет question`)
      const options = Array.isArray(item.options) ? item.options : []
      if (options.length < 2) errors.push(`${label}: нужно хотя бы 2 варианта`)
      if (!options.some((option) => option.correct)) errors.push(`${label}: нет верного варианта`)
      if (options.some((option) => typeof option.text !== 'string' || !option.text.trim())) errors.push(`${label}: пустой текст варианта`)
    }
    if (item.kind === 'order') {
      if (!item.prompt) errors.push(`${label}: нет prompt`)
      if (!Array.isArray(item.steps) || item.steps.length < 3) errors.push(`${label}: нужно хотя бы 3 шага`)
      else if (new Set(item.steps).size !== item.steps.length) errors.push(`${label}: шаги должны различаться`)
    }
    if (TASK_KINDS.includes(item.kind)) await checkCode(item, label, errors)
    if (item.kind === 'output') {
      if (typeof item.code !== 'string' || !Array.isArray(item.answer)) {
        errors.push(`${label}: нужны code и answer (список строк)`)
        continue
      }
      try {
        const actual = await runOutput(item.code)
        const expected = item.answer.map(String)
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          errors.push(`${label}: ответ не совпадает с реальным выводом. Указано ${JSON.stringify(expected)}, выводится ${JSON.stringify(actual)}`)
        }
      } catch (error) {
        errors.push(`${label}: код упал при запуске — ${error.message}`)
      }
    }
  }
  return items.length
}

const isText = (value) => typeof value === 'string' && value.trim() !== ''

// Стандартная библиотека TypeScript для задач на типы: читается один раз, разобранные файлы кешируются.
let typeLibs = null
const typeCache = new Map()
const libDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', 'ts6', 'lib')

/** Запуск решения так же, как в браузере: JavaScript — тестами, типы — компилятором. */
async function runTask(item, code) {
  if (item.kind === 'types') {
    typeLibs ??= collectLibs((file) => readFileSync(path.join(libDir, file), 'utf8'))
    return checkTypes(ts, code, item.tests, typeLibs, typeCache)
  }
  return runCode(code, item.tests)
}

/**
 * React-задачи здесь только собираются: тестам нужен DOM, поэтому эталоны и заготовки
 * прогоняются в npm test (test/content/react-tasks.test.tsx) и в e2e.
 */
function checkReactBuild(item, label, errors) {
  for (const field of ['solution', 'starter']) {
    const { error } = compileReact(ts, item[field], item.tests, item.preview)
    if (error) errors.push(`${label}: ${field} не собирается — ${error}`)
  }
}

async function checkCode(item, label, errors) {
  for (const field of ['title', 'prompt', 'tests', 'solution']) {
    if (!isText(item[field])) errors.push(`${label}: нет ${field}`)
  }
  if (typeof item.starter !== 'string') errors.push(`${label}: нет starter (может быть пустой строкой)`)
  if (!TASK_LEVELS.includes(item.level)) {
    errors.push(`${label}: level должен быть ${TASK_LEVELS.join(', ')}`)
    return
  }
  const hints = item.hints ?? []
  if (!Array.isArray(hints) || hints.some((hint) => !isText(hint))) errors.push(`${label}: hints — список непустых строк`)
  else if (hints.length < MIN_HINTS[item.level]) errors.push(`${label}: для уровня ${item.level} нужно подсказок не меньше ${MIN_HINTS[item.level]}`)
  if (!isText(item.tests) || !isText(item.solution) || typeof item.starter !== 'string') return
  if (item.kind === 'react') return checkReactBuild(item, label, errors)

  // Неверная заготовка может оставить отклонённый промис без обработчика. Для проверки это просто проваленный тест,
  // а не падение всего процесса.
  const ignore = () => {}
  process.on('unhandledRejection', ignore)
  const reference = await runTask(item, item.solution)
  if (!isSolved(reference)) {
    const failed = reference.status === 'ok' ? reference.tests.filter((test) => !test.passed).map((test) => `${test.name}: ${test.error}`) : [reference.error]
    errors.push(`${label}: эталон не проходит тесты — ${reference.tests.length ? failed.join('; ') : failed[0] ?? 'тестов нет'}`)
  }
  const starter = await runTask(item, item.starter)
  // Даём отложенным отклонениям заготовки дойти до обработчика, прежде чем его снять.
  await new Promise((resolve) => setTimeout(resolve, 0))
  process.off('unhandledRejection', ignore)
  if (isSolved(starter)) errors.push(`${label}: заготовка уже проходит все тесты — тесты ничего не проверяют`)
}

/** Этапы траектории (stages.yaml, если есть): каждый блок — ровно в одном этапе, лишних нет. */
async function checkStages(dir, blocks, errors) {
  const text = await readFile(path.join(dir, 'stages.yaml'), 'utf8').catch(() => null)
  if (text === null) return
  const stages = parseYaml(text, 'stages.yaml', errors)
  const known = new Set(blocks.map((block) => block.slug))
  const seen = new Map()
  for (const [index, stage] of stages.entries()) {
    const label = `stages.yaml #${index + 1}`
    if (!isText(stage.title)) errors.push(`${label}: нет title`)
    for (const slug of Array.isArray(stage.blocks) ? stage.blocks : []) {
      if (!known.has(slug)) errors.push(`${label}: блока «${slug}» нет в дереве`)
      else if (seen.has(slug)) errors.push(`${label}: блок «${slug}» уже есть в этапе #${seen.get(slug)}`)
      seen.set(slug, index + 1)
    }
  }
  for (const slug of known) if (!seen.has(slug)) errors.push(`stages.yaml: блок «${slug}» не входит ни в один этап`)
}

/** Состав темы по нормам: карточек (без обратных), быстрых заданий и задач. Сообщения — о том, чего не хватает. */
function checkNorms(where, grade, cards, practice, errors) {
  const norm = NORMS[grade]
  if (!norm) return
  const have = {
    cards: cards.length,
    quick: practice.filter((item) => QUICK_KINDS.includes(item.kind)).length,
    tasks: practice.filter((item) => TASK_KINDS.includes(item.kind)).length,
  }
  const names = { cards: 'карточек', quick: 'быстрых заданий (квиз, «что выведет», порядок)', tasks: 'задач с кодом' }
  for (const field of ['cards', 'quick', 'tasks']) {
    if (have[field] < norm[field]) errors.push(`${where}: ${names[field]} ${have[field]}, нужно не меньше ${norm[field]} (${grade})`)
  }
}

/** Ссылки <Practice id="ключ" /> в уроке: каждая ведёт на задание этой темы. */
function checkPracticeRefs(where, lesson, practice, errors) {
  const keys = new Set(practice.map((item) => item.key))
  for (const match of lesson.matchAll(/<Practice\s+id="([^"]*)"/g)) {
    if (!keys.has(match[1])) errors.push(`${where}.mdx: <Practice id="${match[1]}" /> — такого задания нет в ${where.split('/').at(-1)}.practice.yaml`)
  }
}

/** Тема попадает в проверку: без фильтра — все, с фильтром — id темы начинается с него (с специальностью или без). */
const matches = (only, specialty, where) => !only || where === only || where.startsWith(`${only}/`) || `${specialty}/${where}` === only || `${specialty}/${where}`.startsWith(`${only}/`)

/**
 * Проверяет каталог content/. Возвращает список ошибок и статистику.
 * @param {string} root путь к каталогу content
 * @param {{ only?: string }} [options] only — проверить только темы с этим id или префиксом: «javascript/async» или «frontend/javascript/async/promises»
 */
export async function checkContent(root, { only } = {}) {
  const errors = []
  const stats = { leaves: 0, filled: 0, cards: 0, practice: 0 }
  const specialties = parse(await readFile(path.join(root, 'specialties.yaml'), 'utf8'))

  for (const specialty of specialties.filter((item) => item.status === 'active')) {
    const dir = path.join(root, specialty.slug)
    const blocks = parse(await readFile(path.join(dir, 'tree.yaml'), 'utf8'))
    const expected = new Set()

    async function walk(nodes, parents) {
      const seen = new Set()
      for (const node of nodes) {
        const where = [...parents, node.slug ?? '?'].join('/')
        if (!node.slug || !KEY.test(node.slug)) errors.push(`${where}: slug должен быть из латиницы, цифр и дефисов`)
        // Без slug у темы нет пути к файлам — дальше проверять нечего.
        if (!node.slug) continue
        if (!node.title) errors.push(`${where}: нет title`)
        if (seen.has(node.slug)) errors.push(`${where}: повторяется slug среди соседей`)
        seen.add(node.slug)
        if (node.grade && !['J', 'M', 'S'].includes(node.grade)) errors.push(`${where}: grade должен быть J, M или S`)
        const children = node.children ?? []
        if (children.length) {
          if (node.content) errors.push(`${where}: у узла с детьми не может быть content`)
          await walk(children, [...parents, node.slug])
          continue
        }
        const base = path.join(dir, ...parents, node.slug)
        // Файлы темы вне фильтра не проверяются, но и не считаются «осиротевшими».
        if (!matches(only, specialty.slug, where)) {
          for (const ext of ['cards.yaml', 'practice.yaml', 'mdx']) expected.add(`${base}.${ext}`)
          continue
        }
        stats.leaves++
        const keys = new Set()
        let todo = 0

        const cardsText = await readFile(`${base}.cards.yaml`, 'utf8').catch(() => null)
        let cards = []
        if (cardsText !== null) {
          expected.add(`${base}.cards.yaml`)
          todo += countTodo(cardsText)
          cards = parseYaml(cardsText, `${where}.cards.yaml`, errors)
          stats.cards += checkCards(cards, where, keys, errors)
        }

        const practiceText = await readFile(`${base}.practice.yaml`, 'utf8').catch(() => null)
        let practice = []
        if (practiceText !== null) {
          expected.add(`${base}.practice.yaml`)
          todo += countTodo(practiceText)
          practice = parseYaml(practiceText, `${where}.practice.yaml`, errors)
          stats.practice += await checkPractice(practice, where, keys, errors)
        }

        if (node.content) {
          stats.filled++
          expected.add(`${base}.mdx`)
          const lesson = await readFile(`${base}.mdx`, 'utf8').catch(() => null)
          if (lesson === null) errors.push(`${where}: content: true, но нет файла ${path.relative(root, `${base}.mdx`)}`)
          else {
            // Каждая тема говорит, когда и на каких версиях её проверили: это правило актуальности контента.
            if (!/export const meta = \{[^}]*verified:[^}]*versions:/s.test(lesson)) errors.push(`${where}.mdx: нет export const meta с verified и versions`)
            todo += countTodo(lesson)
            checkPracticeRefs(where, lesson, practice, errors)
          }
          for (const goal of node.goals ?? []) todo += countTodo(String(goal))
          checkNorms(where, node.grade, cards, practice, errors)
        }
        if (todo) errors.push(`${where}: незаполненных меток TODO — ${todo}`)
      }
    }

    await walk(blocks, [])
    await checkStages(dir, blocks, errors)
    for (const file of await listContentFiles(dir)) {
      if (!expected.has(file)) errors.push(`${path.relative(root, file)}: файл есть, но в дереве нет такой темы (или у неё нет content: true)`)
    }
  }

  return { errors, stats }
}
