import ts from 'ts6'
import { describe, expect, it } from 'vitest'
import { compileReact, LOOP_ERROR, LOOP_LIMIT, loopLimit } from '@/features/solve-task/lib/react-compile'

/** Выполняет собранный модуль: exports, лимит циклов и сбор console.log. */
function execute(code: string) {
  const logs: unknown[] = []
  const exports: Record<string, unknown> = {}
  new Function('exports', '__loopLimit', 'React', 'log', code)(exports, loopLimit, { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) }, (value: unknown) => logs.push(value))
  return { logs, exports }
}

describe('сборка React-задачи', () => {
  it('JSX, TypeScript и export превращаются в CommonJS; предпросмотр — в exports.__licPreview', () => {
    const { code, error } = compileReact(ts, 'export function C({ n }: { n: number }) { return <b>{n}</b> }', 'log(C({ n: 1 }).type)', '<C n={2} />')
    expect(error).toBeUndefined()
    const { logs, exports } = execute(code!)
    expect(logs).toEqual(['b'])
    expect((exports.__licPreview as () => { props: unknown })().props).toEqual({ n: 2 })
  })

  it('без предпросмотра exports.__licPreview нет', () => {
    expect(execute(compileReact(ts, 'const a = 1', '')!.code!).exports.__licPreview).toBeUndefined()
  })

  it('все виды циклов работают как раньше, включая метки и continue', () => {
    const source = [
      'let n = 0',
      'outer: for (const a of [1, 2]) { for (const b of [1, 2]) { if (b === 2) continue outer; n++ } }',
      'do { n++ } while (n < 5)',
      'for (const k in { x: 1 }) n++',
      'let i = 0',
      'while (i < 2) i++',
      'for (let j = 0; j < 2; j++) n++',
      'log(n + i)',
    ].join('\n')
    expect(execute(compileReact(ts, source, '').code!).logs).toEqual([10])
  })

  it('бесконечный цикл любого вида останавливается защитой', () => {
    expect(LOOP_LIMIT).toBe(1_000_000)
    for (const loop of ['while (true) {}', 'for (;;) {}', 'do {} while (true)', 'label: while (true) {}']) {
      expect(() => execute(compileReact(ts, loop, '').code!), loop).toThrow(LOOP_ERROR)
    }
    expect(LOOP_ERROR.replace(/\s/g, ' ')).toBe('Цикл повторился больше 1 000 000 раз и был остановлен — похоже на бесконечный цикл.')
  })

  it('синтаксическая ошибка — с номером строки', () => {
    expect(compileReact(ts, 'const a = 1\nfunction (', '')).toEqual({ error: 'Синтаксическая ошибка, строка 2: Identifier expected.' })
  })
})
