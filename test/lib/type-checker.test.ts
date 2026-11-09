import { readFileSync } from 'node:fs'
import path from 'node:path'
import ts from 'ts6'
import { describe, expect, it, vi } from 'vitest'
import { checkTypes, collectLibs, createHost, PRELUDE, ROOT_LIBS } from '@/lib/type-checker'

const read = (file: string) => readFileSync(path.join(process.cwd(), 'node_modules/ts6/lib', file), 'utf8')
const libs = collectLibs(read)
const cache = new Map()
const check = (code: string, tests: string) => checkTypes(ts, code, tests, libs, cache)

describe('библиотека TypeScript для задач', () => {
  it('корневые файлы и всё, на что они ссылаются', () => {
    expect(ROOT_LIBS).toEqual(['lib.es2023.d.ts', 'lib.dom.d.ts'])
    expect(Object.keys(libs)).toEqual(expect.arrayContaining(['lib.es2023.d.ts', 'lib.es2022.d.ts', 'lib.es5.d.ts', 'lib.dom.d.ts', 'lib.decorators.d.ts']))
  })

  it('каждый файл читается один раз, даже если на него ссылаются несколько', () => {
    const reader = vi.fn((file: string) => (file === 'root.d.ts' ? '/// <reference lib="a" />\n/// <reference lib="B" />' : file === 'lib.a.d.ts' ? '/// <reference lib="b" />' : ''))
    expect(Object.keys(collectLibs(reader, ['root.d.ts'])).sort()).toEqual(['lib.a.d.ts', 'lib.b.d.ts', 'root.d.ts'])
    expect(reader).toHaveBeenCalledTimes(3)
  })

  it('вспомогательные типы для тестов', () => {
    expect(PRELUDE).toContain('type Equal<X, Y>')
    expect(PRELUDE).toContain('type Expect<T extends true>')
  })
})

describe('проверка задачи на типы', () => {
  const tests = [
    'type A = { a: 1; b: 2 }',
    'type cases = [',
    "  Expect<Equal<MyPick<A, 'a'>, { a: 1 }>>,",
    '  IsTrue<true>,',
    '  IsFalse<Equal<1, 2>>,',
    '  IsTrue<NotEqual<1, 2>>,',
    ']',
    '// @ts-expect-error',
    "type bad = MyPick<A, 'z'>",
  ].join('\n')

  it('верное решение проходит все тесты; ожидаемая ошибка — отдельный тест', () => {
    const result = check('type MyPick<T, K extends keyof T> = { [P in K]: T[P] }\n', tests)
    expect(result).toEqual({
      status: 'ok',
      logs: [],
      tests: [
        { name: 'Решение без ошибок типов', passed: true },
        { name: "Expect<Equal<MyPick<A, 'a'>, { a: 1 }>>", passed: true },
        { name: 'IsTrue<true>', passed: true },
        { name: 'IsFalse<Equal<1, 2>>', passed: true },
        { name: 'IsTrue<NotEqual<1, 2>>', passed: true },
        { name: "ошибка ожидается: type bad = MyPick<A, 'z'>", passed: true },
      ],
    })
  })

  it('неверное решение: какие тесты не прошли и почему; ошибки в решении — с номером строки', () => {
    const result = check("type MyPick<T, K> = any\nconst x: number = 'строка'", tests)
    expect(result.tests).toEqual([
      { name: 'Решение без ошибок типов', passed: false, error: "строка 2: Type 'string' is not assignable to type 'number'." },
      { name: "Expect<Equal<MyPick<A, 'a'>, { a: 1 }>>", passed: false, error: "Type 'false' does not satisfy the constraint 'true'." },
      { name: 'IsTrue<true>', passed: true },
      { name: 'IsFalse<Equal<1, 2>>', passed: true },
      { name: 'IsTrue<NotEqual<1, 2>>', passed: true },
      { name: "ошибка ожидается: type bad = MyPick<A, 'z'>", passed: false, error: "Unused '@ts-expect-error' directive." },
    ])
  })

  it('ошибка в тестах вне какого-либо теста не теряется', () => {
    const result = check('type X = 1', "type cases = [Expect<Equal<X, 1>>]\ntype oops = Nope")
    expect(result.tests.at(-1)).toEqual({ name: 'Остальные строки тестов', passed: false, error: "строка 2: Cannot find name 'Nope'." })
  })

  it('ожидание ошибки в последней строке без кода под ним', () => {
    const result = check('type X = 1', '// @ts-expect-error')
    expect(result.tests[1]).toMatchObject({ name: 'ошибка ожидается: ', passed: false })
  })

  it('строка с Expect под ожиданием ошибки — часть того же теста, а не новый', () => {
    const result = check('type X = 1', '// @ts-expect-error\ntype wrong = Expect<Equal<X, 2>>')
    expect(result.tests).toEqual([
      { name: 'Решение без ошибок типов', passed: true },
      { name: 'ошибка ожидается: type wrong = Expect<Equal<X, 2>>', passed: true },
    ])
  })

  it('без тестов — пустой список: задача не может считаться решённой', () => {
    expect(check('type X = 1', 'type Y = 2').tests).toEqual([])
  })

  it('синтаксическая ошибка в решении', () => {
    const result = check('const = 1', 'type cases = [Expect<Equal<1, 1>>]')
    expect(result.tests[0]).toMatchObject({ name: 'Решение без ошибок типов', passed: false })
  })

  it('файлы библиотеки разбираются один раз и берутся из кеша', () => {
    const own = new Map()
    checkTypes(ts, 'type X = 1', 'type cases = [Expect<Equal<X, 1>>]', libs, own)
    expect(own.size).toBe(Object.keys(libs).length)
    const first = new Map(own)
    checkTypes(ts, 'type X = 2', 'type cases = [Expect<Equal<X, 2>>]', libs, own)
    // Те же самые объекты: повторного разбора не было.
    for (const [name, file] of first) expect(own.get(name)).toBe(file)
  })

  it('кеш по умолчанию', () => {
    expect(checkTypes(ts, 'type X = 1', 'type cases = [Expect<Equal<X, 1>>]', libs).tests.every((item) => item.passed)).toBe(true)
  })
})

describe('виртуальная файловая система компилятора', () => {
  it('файлы в памяти, библиотека из кеша, служебные методы', () => {
    const own = new Map()
    const host = createHost(ts, { 'lib.x.d.ts': 'declare const x: 1', 'task.ts': 'x' }, { 'lib.x.d.ts': 'declare const x: 1' }, own)
    expect(host.fileExists('task.ts')).toBe(true)
    expect(host.fileExists('нет.ts')).toBe(false)
    expect(host.readFile('task.ts')).toBe('x')
    expect(host.getSourceFile('нет.ts', ts.ScriptTarget.ES2022)).toBeUndefined()
    expect(host.getSourceFile('lib.x.d.ts', ts.ScriptTarget.ES2022)).toBe(host.getSourceFile('lib.x.d.ts', ts.ScriptTarget.ES2022))
    expect(host.getSourceFile('task.ts', ts.ScriptTarget.ES2022)).not.toBe(host.getSourceFile('task.ts', ts.ScriptTarget.ES2022))
    expect(own.size).toBe(1)
    expect(host.getDefaultLibFileName({})).toBe('lib.d.ts')
    expect(host.getDefaultLibLocation!()).toBe('')
    expect(host.writeFile('a', '', false)).toBeUndefined()
    expect(host.getCurrentDirectory()).toBe('')
    expect(host.getCanonicalFileName('A.ts')).toBe('A.ts')
    expect(host.useCaseSensitiveFileNames()).toBe(true)
    expect(host.getNewLine()).toBe('\n')
  })
})
