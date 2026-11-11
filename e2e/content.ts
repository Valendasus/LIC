import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'

/** Задания читаются прямо из контента: тесты знают правильные ответы, не дублируя их. */
const root = path.join(process.cwd(), 'content/frontend')

export interface RawPractice {
  key: string
  kind: 'quiz' | 'output' | 'order' | 'code' | 'types' | 'react'
  question?: string
  options?: { text: string; correct?: boolean }[]
  code?: string
  answer?: string[]
  prompt?: string
  steps?: string[]
  title?: string
  starter?: string
  solution?: string
  hints?: string[]
}

export function practice(topicPath: string): RawPractice[] {
  return parse(readFileSync(path.join(root, `${topicPath}.practice.yaml`), 'utf8'))
}

/** Все темы, у которых есть задания с кодом указанного вида, — в порядке дерева. Новые темы попадают в проверки сами. */
export function topicsWithTasks(kind: string): string[] {
  type Node = { slug: string; children?: Node[] }
  const tree = parse(readFileSync(path.join(root, 'tree.yaml'), 'utf8')) as Node[]
  const out: string[] = []
  const walk = (nodes: Node[], parents: string[]) => {
    for (const node of nodes) {
      const where = [...parents, node.slug]
      if (node.children) walk(node.children, where)
      else if (existsSync(path.join(root, `${where.join('/')}.practice.yaml`)) && practice(where.join('/')).some((item) => item.kind === kind)) out.push(where.join('/'))
    }
  }
  walk(tree, [])
  return out
}

export function cards(topicPath: string): { key: string; front: string; back: string; reverse?: boolean }[] {
  return parse(readFileSync(path.join(root, `${topicPath}.cards.yaml`), 'utf8'))
}

/** Текст так, как его показывает упрощённая разметка: без обратных кавычек и звёздочек. */
export function plain(text: string) {
  return text.replace(/`/g, '').replace(/\*\*/g, '').trim()
}
