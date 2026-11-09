/**
 * Проверка задач на типы компилятором TypeScript 6 (у TypeScript 7 нет JavaScript API).
 *
 * Решение и тесты складываются в один файл. Тест — строка с `Expect<…>` или `// @ts-expect-error`:
 * ошибка типов на строках теста — тест не пройден, ошибка в решении — отдельный пункт «Решение без ошибок типов».
 * Модуль не импортирует TypeScript сам: компилятор и файлы стандартной библиотеки передаются снаружи.
 * В браузере это делает воркер, в Node — npm run content:check.
 */
import type * as TS from 'ts6'
import type { RunResult, TestResult } from './code-runner'

type Ts = typeof TS

/** Стандартная библиотека, с которой проверяются задачи. Остальные файлы подтягиваются по /// <reference lib>. */
export const ROOT_LIBS = ['lib.es2023.d.ts', 'lib.dom.d.ts']

/** Вспомогательные типы для тестов: те же, что в type-challenges. */
export const PRELUDE = `type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false
type NotEqual<X, Y> = true extends Equal<X, Y> ? false : true
type Expect<T extends true> = T
type IsTrue<T extends true> = T
type IsFalse<T extends false> = T
`

const SOLUTION_CHECK = 'Решение без ошибок типов'

/** Все файлы библиотеки, на которые ссылаются корневые: lib.es2023 → lib.es2022 → … → lib.es5. */
export function collectLibs(read: (file: string) => string, roots = ROOT_LIBS) {
  const libs: Record<string, string> = {}
  const queue = [...roots]
  while (queue.length) {
    const file = queue.pop()!
    if (libs[file] !== undefined) continue
    libs[file] = read(file)
    for (const [, name] of libs[file].matchAll(/\/\/\/\s*<reference lib="([^"]+)"/g)) queue.push(`lib.${name.toLowerCase()}.d.ts`)
  }
  return libs
}

/** Где начинаются тесты: строка с Expect<…> или ожиданием ошибки. Имя теста — следующая за комментарием строка или сама строка. */
function findCases(lines: string[]) {
  const cases: { name: string; start: number; end: number }[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    const expectsError = line.startsWith('// @ts-expect-error')
    if (!expectsError && !line.includes('Expect<') && !line.includes('IsTrue<') && !line.includes('IsFalse<')) continue
    // Ожидание ошибки и строка под ним — один тест.
    if (cases.at(-1)?.end === i) continue
    const name = expectsError ? `ошибка ожидается: ${(lines[i + 1] ?? '').trim()}` : line.replace(/,$/, '')
    cases.push({ name, start: i, end: expectsError ? i + 1 : i })
  }
  return cases
}

/**
 * Виртуальная файловая система для компилятора: файлы только в памяти, библиотека разбирается один раз.
 * Часть методов компилятор вызывает не всегда, но интерфейс их требует.
 */
export function createHost(ts: Ts, files: Record<string, string>, libs: Record<string, string>, cache: Map<string, TS.SourceFile>): TS.CompilerHost {
  return {
    getSourceFile: (name, version) => {
      if (files[name] === undefined) return undefined
      if (libs[name] === undefined) return ts.createSourceFile(name, files[name], version)
      if (!cache.has(name)) cache.set(name, ts.createSourceFile(name, files[name], version))
      return cache.get(name)
    },
    getDefaultLibFileName: () => 'lib.d.ts',
    getDefaultLibLocation: () => '',
    writeFile: () => {},
    getCurrentDirectory: () => '',
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => files[name] !== undefined,
    readFile: (name) => files[name],
  }
}

/**
 * @param cache разобранные файлы библиотеки между запусками: lib.dom.d.ts большой, и разбор занимает сотни миллисекунд.
 */
export function checkTypes(ts: Ts, code: string, tests: string, libs: Record<string, string>, cache = new Map<string, TS.SourceFile>()): RunResult {
  const codeLines = code.replace(/\n$/, '').split('\n')
  const testLines = tests.replace(/\n$/, '').split('\n')
  const offset = codeLines.length + 1
  const source = `${codeLines.join('\n')}\n\n${testLines.join('\n')}\n`

  const files: Record<string, string> = { ...libs, 'prelude.d.ts': PRELUDE, 'task.ts': source }
  const options: TS.CompilerOptions = {
    strict: true,
    noEmit: true,
    target: ts.ScriptTarget.ES2022,
    lib: ROOT_LIBS,
    types: [],
    // Задачу пишут как скрипт: export не нужен и не мешает.
    moduleDetection: ts.ModuleDetectionKind.Legacy,
    noUnusedLocals: false,
    skipLibCheck: true,
  }
  const host = createHost(ts, files, libs, cache)

  const program = ts.createProgram(['prelude.d.ts', 'task.ts'], options, host)
  // Диагностика только по файлу задачи: проверять библиотеку на каждый запуск незачем и долго.
  const task = program.getSourceFile('task.ts')!
  const diagnostics = [...program.getSyntacticDiagnostics(task), ...program.getSemanticDiagnostics(task)]
  const located = diagnostics.map((item) => ({
    line: item.file!.getLineAndCharacterOfPosition(item.start!).line,
    text: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
  }))

  const solutionErrors = located.filter((item) => item.line < offset).map((item) => `строка ${item.line + 1}: ${item.text}`)
  const cases = findCases(testLines)
  const results: TestResult[] = [
    solutionErrors.length ? { name: SOLUTION_CHECK, passed: false, error: solutionErrors.join('\n') } : { name: SOLUTION_CHECK, passed: true },
    ...cases.map(({ name, start, end }) => {
      const errors = located.filter((item) => item.line - offset >= start && item.line - offset <= end)
      return errors.length ? { name, passed: false, error: errors.map((item) => item.text).join('\n') } : { name, passed: true }
    }),
  ]
  // Ошибки в тестах вне какого-либо теста (например, опечатка в имени типа) тоже не пропускаем.
  const stray = located.filter((item) => item.line >= offset && !cases.some(({ start, end }) => item.line - offset >= start && item.line - offset <= end))
  if (stray.length) results.push({ name: 'Остальные строки тестов', passed: false, error: stray.map((item) => `строка ${item.line - offset + 1}: ${item.text}`).join('\n') })

  return { status: 'ok', tests: cases.length ? results : [], logs: [] }
}
