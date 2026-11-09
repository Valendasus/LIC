// Архитектурные правила Feature-Sliced Design проверяются тестом, а не только договорённостью (CLAUDE.md).
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.join(process.cwd(), 'src')
const LAYERS = ['shared', 'entities', 'features', 'widgets', 'views', 'app'] as const
type Layer = (typeof LAYERS)[number]

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? files(full) : /\.tsx?$/.test(entry.name) ? [full] : []
  })
}

/** Модуль относительно src без расширения: «features/solve-task/ui/CodeView». */
const moduleOf = (file: string) => path.relative(SRC, file).replace(/\.tsx?$/, '')

function locate(mod: string): { layer: Layer | 'root'; slice: string | null } {
  const [first, second] = mod.split('/')
  if (!(LAYERS as readonly string[]).includes(first)) return { layer: 'root', slice: null }
  const layer = first as Layer
  return { layer, slice: layer === 'shared' || layer === 'app' ? null : `${first}/${second}` }
}

interface Violation {
  file: string
  spec: string
  rule: string
}

/** Все нарушения правил FSD в исходниках. Пусто — архитектура соблюдена. */
export function findViolations(sources: { file: string; text: string }[]): Violation[] {
  const violations: Violation[] = []
  for (const { file, text } of sources) {
    const mod = file
    const from = locate(mod)
    const isClient = /^['"]use client['"]/m.test(text)
    for (const match of text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const spec = match[1]
      let target: string
      if (spec.startsWith('@/')) target = spec.slice(2)
      else if (spec.startsWith('.')) target = path.normalize(path.join(path.dirname(mod), spec))
      else continue
      const to = locate(target)
      const add = (rule: string) => violations.push({ file: mod, spec, rule })

      if (isClient && (target.endsWith('/server') || target === 'shared/api/db')) add('клиентский модуль импортирует серверный')
      if (to.layer === 'root' || from.layer === 'root') continue
      if (from.slice && from.slice === to.slice) {
        if (spec.startsWith('@/')) add('внутри слайса импорт относительный')
        continue
      }
      if (LAYERS.indexOf(to.layer) > LAYERS.indexOf(from.layer)) add(`слой ${from.layer} не может импортировать слой выше (${to.layer})`)
      if (to.layer === from.layer && to.layer !== 'shared' && to.layer !== 'app') {
        if (target !== `${to.slice}/@x/${from.slice!.split('/')[1]}`) add('слайсы одного слоя связываются только через @x')
        continue
      }
      if (to.slice && target !== to.slice && target !== `${to.slice}/server`) add('импорт в чужой слайс — только через index или server')
      if (to.layer === 'shared' && spec.startsWith('.') && from.layer !== 'shared') add('shared импортируется по алиасу @/shared')
    }
  }
  return violations
}

describe('архитектура FSD', () => {
  const sources = files(SRC).map((file) => ({ file: moduleOf(file), text: readFileSync(file, 'utf8') }))

  it('в исходниках нет нарушений', () => {
    expect(findViolations(sources)).toEqual([])
  })

  it('слои на месте, у каждого слайса есть публичный API', () => {
    const slices = new Set(sources.map((source) => locate(source.file).slice).filter(Boolean))
    expect(slices.size).toBeGreaterThan(10)
    for (const slice of slices) expect(sources.some((source) => source.file === `${slice}/index`), `${slice}/index.ts`).toBe(true)
  })

  it('проверка ловит каждое нарушение', () => {
    const cases: [string, string, string][] = [
      ['entities/topic/ui/A', "import { x } from '@/features/solve-task'", 'слой entities не может импортировать слой выше (features)'],
      ['features/a/ui/A', "import { x } from '@/features/b'", 'слайсы одного слоя связываются только через @x'],
      ['features/a/ui/A', "import { x } from '@/entities/topic/api/tree'", 'импорт в чужой слайс — только через index или server'],
      ['features/a/ui/A', "import { x } from '@/features/a/lib/x'", 'внутри слайса импорт относительный'],
      ['features/a/ui/A', "'use client'\nimport { x } from '@/entities/topic/server'", 'клиентский модуль импортирует серверный'],
      ['features/a/ui/A', "import { x } from '../../../shared/ui'", 'shared импортируется по алиасу @/shared'],
    ]
    for (const [file, text, rule] of cases) expect(findViolations([{ file, text }]).map((v) => v.rule)).toContain(rule)
    // Разрешённое: @x, server, корень src, пакеты.
    expect(
      findViolations([
        { file: 'entities/review/api/s', text: "import { a } from '@/entities/topic/@x/review'\nimport b from 'react'\nimport c from '@/mdx-components'" },
        { file: 'app/page', text: "import { a } from '@/entities/topic/server'\nimport { b } from '@/views/home'" },
        { file: 'shared/ui/A', text: "import { B } from './B'" },
      ]),
    ).toEqual([])
  })
})
