import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { cache } from 'react'
import { parse } from 'yaml'

/** Уровень, для которого тема обязательна: J — первая работа, M — middle, S — senior или обзор. */
export type Grade = 'J' | 'M' | 'S'

/** Узел дерева в том виде, в каком он записан в content/<специальность>/tree.yaml. */
interface RawNode {
  slug: string
  title: string
  grade?: Grade
  summary?: string
  group?: string
  /** У листа есть файл с содержанием: content/<специальность>/<путь>.mdx */
  content?: boolean
  goals?: string[]
  children?: RawNode[]
}

export interface TreeNode extends Omit<RawNode, 'children'> {
  /** Полный идентификатор: «frontend/fe6/async/event-loop». Он же ключ прогресса в базе. */
  id: string
  /** Путь от корня специальности: ['fe6', 'async', 'event-loop']. */
  path: string[]
  children: TreeNode[]
}

export interface Specialty {
  slug: string
  title: string
  summary: string
  status: 'active' | 'planned'
}

/** Каталог контента. LIC_CONTENT_DIR позволяет тестам подставить свой набор тем. */
const CONTENT_DIR = process.env.LIC_CONTENT_DIR ?? path.join(process.cwd(), 'content')

export const getSpecialties = cache(async (): Promise<Specialty[]> => {
  const raw = await readFile(path.join(/*turbopackIgnore: true*/ CONTENT_DIR, 'specialties.yaml'), 'utf8')
  return parse(raw) as Specialty[]
})

function build(raw: RawNode, parent: string[], specialty: string): TreeNode {
  const nodePath = [...parent, raw.slug]
  return {
    ...raw,
    id: [specialty, ...nodePath].join('/'),
    path: nodePath,
    children: (raw.children ?? []).map((child) => build(child, nodePath, specialty)),
  }
}

/** Корень дерева специальности: его дети — блоки (HTML, CSS, JavaScript …). */
export const getTree = cache(async (specialty: string): Promise<TreeNode | null> => {
  const specialties = await getSpecialties()
  if (!specialties.some((item) => item.slug === specialty && item.status === 'active')) return null
  const raw = await readFile(path.join(/*turbopackIgnore: true*/ CONTENT_DIR, specialty, 'tree.yaml'), 'utf8')
  const blocks = parse(raw) as RawNode[]
  return {
    slug: specialty,
    title: specialties.find((item) => item.slug === specialty)!.title,
    summary: specialties.find((item) => item.slug === specialty)!.summary,
    id: specialty,
    path: [],
    children: blocks.map((block) => build(block, [], specialty)),
  }
})

/** Узел по пути и цепочка предков для хлебных крошек. */
export function findNode(root: TreeNode, slugs: string[]) {
  const trail: TreeNode[] = [root]
  let current = root
  for (const slug of slugs) {
    const next = current.children.find((child) => child.slug === slug)
    if (!next) return null
    trail.push(next)
    current = next
  }
  return { node: current, trail }
}

/** Листья — единицы обучения. Узел без детей считается листом, даже если содержания ещё нет. */
export function leavesOf(node: TreeNode): TreeNode[] {
  if (node.children.length === 0) return [node]
  return node.children.flatMap(leavesOf)
}

export function hrefOf(node: TreeNode) {
  return `/${node.id}`
}

export const GRADE_LABEL: Record<Grade, string> = {
  J: 'Junior',
  M: 'Middle',
  S: 'Senior',
}

export interface Stage {
  title: string
  summary: string
  blocks: TreeNode[]
}

/**
 * Этапы траектории специальности (content/<специальность>/stages.yaml). Без файла этапов — один этап из всех блоков:
 * курс всё равно показывается путём.
 */
export const getStages = cache(async (specialty: string): Promise<Stage[]> => {
  const tree = await getTree(specialty)
  if (!tree) return []
  const raw = await readFile(path.join(/*turbopackIgnore: true*/ CONTENT_DIR, specialty, 'stages.yaml'), 'utf8').catch(() => null)
  if (raw === null) return [{ title: tree.title, summary: '', blocks: tree.children }]
  const bySlug = new Map(tree.children.map((block) => [block.slug, block]))
  return (parse(raw) as { title: string; summary?: string; blocks: string[] }[]).map((stage) => ({
    title: stage.title,
    summary: stage.summary ?? '',
    blocks: stage.blocks.map((slug) => bySlug.get(slug)).filter((block) => block !== undefined),
  }))
})
