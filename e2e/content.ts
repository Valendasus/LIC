import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'

/** Задания читаются прямо из контента: тесты знают правильные ответы, не дублируя их. */
const root = path.join(process.cwd(), 'content/frontend')

export interface RawPractice {
  key: string
  kind: 'quiz' | 'output' | 'order' | 'code'
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

export function cards(topicPath: string): { key: string; front: string; back: string; reverse?: boolean }[] {
  return parse(readFileSync(path.join(root, `${topicPath}.cards.yaml`), 'utf8'))
}

/** Текст так, как его показывает упрощённая разметка: без обратных кавычек и звёздочек. */
export function plain(text: string) {
  return text.replace(/`/g, '').replace(/\*\*/g, '').trim()
}
