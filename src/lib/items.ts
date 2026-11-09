import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { parse } from 'yaml'
import { getTree, leavesOf, type TreeNode } from './tree'

/**
 * Элементы практики темы. Лежат рядом с темой:
 *   <тема>.cards.yaml     — карточки (самооценка)
 *   <тема>.practice.yaml  — квизы, «что выведет», порядок, задачи на код (автопроверка)
 * id элемента — «<id темы>#<ключ>»: к нему привязано расписание повторений.
 */
import { isTaskKind, type ItemKind, type TaskKind, type TaskLevel } from './kinds'

export type { ItemKind, TaskKind, TaskLevel } from './kinds'
export type CardType = 'term' | 'qa' | 'code'

interface Base {
  id: string
  kind: ItemKind
  topicId: string
  topicTitle: string
  topicHref: string
}

export interface CardItem extends Base {
  kind: 'card'
  type: CardType
  front: string
  back: string
  example?: string
  reversed: boolean
}

export interface QuizOption {
  text: string
  correct: boolean
  /** Почему этот вариант неверный (или почему верный) — показывается после ответа. */
  why?: string
}

export interface QuizItem extends Base {
  kind: 'quiz'
  question: string
  code?: string
  /** Несколько верных ответов: нужно отметить все. */
  multiple: boolean
  options: QuizOption[]
  explain: string
}

export interface OutputItem extends Base {
  kind: 'output'
  code: string
  /** Ожидаемый вывод построчно. Проверяется реальным запуском кода в npm run content:check. */
  answer: string[]
  explain: string
}

export interface OrderItem extends Base {
  kind: 'order'
  prompt: string
  /** Шаги в правильном порядке. */
  steps: string[]
  explain: string
}

/** Задача с редактором и тестами. code — JavaScript, types — типы TypeScript, react — компонент с предпросмотром. */
export interface CodeItem extends Base {
  kind: TaskKind
  title: string
  level: TaskLevel
  /** Условие задачи в разметке RichText. */
  prompt: string
  /** Заготовка, с которой начинается решение. */
  starter: string
  /**
   * Тесты. code и react: вызовы test(name, fn) с expect, spy и sleep (для react ещё render, screen, userEvent).
   * types: строки с Expect<Equal<…>> и // @ts-expect-error.
   */
  tests: string
  /** Только react: JSX-выражение, которое показывается в предпросмотре после запуска. */
  preview?: string
  /** Лестница подсказок: направление → приём → каркас → ключевая строка. */
  hints: string[]
  /** Эталон и разбор. В сессию не передаются: клиент запрашивает их, когда задача решена или открыто решение. */
  solution: string
  explain: string
}

export type PracticeItem = CardItem | QuizItem | OutputItem | OrderItem | CodeItem
export { isTask } from './kinds'

/** Каталог контента. LIC_CONTENT_DIR позволяет тестам подставить свой набор тем. */
const CONTENT_DIR = process.env.LIC_CONTENT_DIR ?? path.join(process.cwd(), 'content')

async function readYaml(file: string): Promise<Record<string, unknown>[]> {
  try {
    return ((parse(await readFile(file, 'utf8')) ?? []) as Record<string, unknown>[])
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

async function readItems(leaf: TreeNode): Promise<PracticeItem[]> {
  const [specialty] = leaf.id.split('/')
  const base = path.join(/*turbopackIgnore: true*/ CONTENT_DIR, specialty, ...leaf.path)
  const topic = { topicId: leaf.id, topicTitle: leaf.title, topicHref: `/${leaf.id}` }
  const [cards, practice] = await Promise.all([readYaml(`${base}.cards.yaml`), readYaml(`${base}.practice.yaml`)])
  const items: PracticeItem[] = []

  for (const raw of cards) {
    const card = raw as { key: string; type: CardType; front: string; back: string; example?: string; reverse?: boolean }
    items.push({ ...topic, id: `${leaf.id}#${card.key}`, kind: 'card', type: card.type, front: card.front, back: card.back, example: card.example, reversed: false })
    // Обратная карточка проверяет вспоминание термина по определению.
    if (card.reverse && card.type === 'term') {
      items.push({ ...topic, id: `${leaf.id}#${card.key}~r`, kind: 'card', type: 'term', front: card.back, back: card.front, reversed: true })
    }
  }

  for (const raw of practice) {
    const id = `${leaf.id}#${raw.key as string}`
    switch (raw.kind) {
      case 'quiz': {
        const options = (raw.options as { text: string; correct?: boolean; why?: string }[]).map((option) => ({
          text: option.text,
          correct: Boolean(option.correct),
          why: option.why,
        }))
        items.push({
          ...topic,
          id,
          kind: 'quiz',
          question: raw.question as string,
          code: raw.code as string | undefined,
          multiple: options.filter((option) => option.correct).length > 1,
          options,
          explain: raw.explain as string,
        })
        break
      }
      case 'output':
        items.push({ ...topic, id, kind: 'output', code: raw.code as string, answer: raw.answer as string[], explain: raw.explain as string })
        break
      case 'order':
        items.push({ ...topic, id, kind: 'order', prompt: raw.prompt as string, steps: raw.steps as string[], explain: raw.explain as string })
        break
      default:
        if (!isTaskKind(raw.kind as ItemKind)) break
        items.push({
          ...topic,
          id,
          kind: raw.kind as TaskKind,
          title: raw.title as string,
          level: raw.level as TaskLevel,
          prompt: raw.prompt as string,
          starter: raw.starter as string,
          tests: raw.tests as string,
          hints: (raw.hints as string[] | undefined) ?? [],
          solution: raw.solution as string,
          explain: raw.explain as string,
          ...(raw.preview ? { preview: raw.preview as string } : {}),
        })
        break
    }
  }
  return items
}

/** Все элементы практики специальности. */
export const getItems = cache(async (specialty: string): Promise<PracticeItem[]> => {
  const tree = await getTree(specialty)
  if (!tree) return []
  const lists = await Promise.all(leavesOf(tree).map(readItems))
  return lists.flat()
})

/** Элементы ветки (id ветки — префикс id тем) и, если указано, только нужных видов. */
export function inScope(items: PracticeItem[], scope?: string, kinds?: ItemKind[]) {
  return items.filter(
    (item) =>
      (!scope || item.topicId === scope || item.topicId.startsWith(`${scope}/`)) &&
      (!kinds?.length || kinds.includes(item.kind)),
  )
}
