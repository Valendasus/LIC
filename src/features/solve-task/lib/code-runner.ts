/**
 * Запуск задачи на код: код ученика и тесты задачи выполняются в одной области видимости,
 * поэтому тесты видят функции, объявленные в решении.
 *
 * Модуль без зависимостей от Node и DOM: в браузере он работает в Web Worker (тренажёр),
 * в Node — в npm run content:check, где проверяется, что эталон проходит тесты, а заготовка нет.
 * Защита от бесконечного цикла — снаружи: воркер останавливают по таймеру.
 */

export interface TestResult {
  name: string
  passed: boolean
  error?: string
}

export interface RunResult {
  /** ok — тесты выполнились (пройдены или нет); error — код не запустился; timeout — выполнение не уложилось во время. */
  status: 'ok' | 'error' | 'timeout'
  tests: TestResult[]
  logs: string[]
  error?: string
}

export interface RunOptions {
  /** Сколько ждать один асинхронный тест. */
  testTimeoutMs?: number
  /** Дополнительные имена в области видимости кода и тестов: React, render, screen и т. п. */
  globals?: Record<string, unknown>
  /** Уборка после каждого теста, например cleanup из Testing Library. */
  afterEach?: () => unknown
}

/** Значение в сообщении об ошибке: строки в кавычках, объекты в JSON, особые случаи отдельно. */
export function show(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'function') return `[функция ${value.name || 'без имени'}]`
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'symbol' || value === undefined || Number.isNaN(value)) return String(value)
  if (value instanceof Error) return `${value.name}: ${value.message}`
  if (value instanceof RegExp) return String(value)
  if (value instanceof Map) return `Map(${value.size}) ${show([...value.entries()])}`
  if (value instanceof Set) return `Set(${value.size}) ${show([...value.values()])}`
  try {
    return JSON.stringify(value, (_key, inner) => (inner === undefined ? '__undefined__' : inner))!.replace(/"__undefined__"/g, 'undefined')
  } catch {
    return String(value)
  }
}

/** Элемент DOM в тексте ошибки: <button> «Отправить». Остальное — через show. */
function describe(value: unknown) {
  const element = value as Element | null
  if (!element || typeof element.tagName !== 'string') return show(value)
  const text = (element.textContent ?? '').trim().slice(0, 40)
  return `<${element.tagName.toLowerCase()}>${text ? ` «${text}»` : ''}`
}

/** Вывод console.log как в консоли браузера: строки без кавычек, остальное — через show. */
function formatLog(args: unknown[]) {
  return args.map((arg) => (typeof arg === 'string' ? arg : show(arg))).join(' ')
}

/** Глубокое сравнение для toEqual: массивы, обычные объекты, Map, Set, Date. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false
  if (a instanceof Date) return a.getTime() === (b as Date).getTime()
  if (a instanceof Map) {
    const other = b as Map<unknown, unknown>
    return a.size === other.size && [...a].every(([key, value]) => other.has(key) && deepEqual(value, other.get(key)))
  }
  if (a instanceof Set) {
    const other = b as Set<unknown>
    return a.size === other.size && [...a].every((value) => other.has(value))
  }
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  return keysA.length === keysB.length && keysA.every((key) => Object.hasOwn(b, key) && deepEqual((a as never)[key], (b as never)[key]))
}

class AssertionError extends Error {}

type Matchers = {
  toBe(expected: unknown): void
  toEqual(expected: unknown): void
  toBeTruthy(): void
  toBeFalsy(): void
  toBeUndefined(): void
  toBeNull(): void
  toContain(expected: unknown): void
  toHaveLength(expected: number): void
  toBeGreaterThan(expected: number): void
  toBeLessThan(expected: number): void
  toBeCloseTo(expected: number, digits?: number): void
  toBeInstanceOf(expected: abstract new (...args: never[]) => unknown): void
  toThrow(expected?: string | RegExp): void
  toBeInTheDocument(): void
  toHaveTextContent(expected: string | RegExp): void
  toHaveValue(expected: unknown): void
  toHaveAttribute(name: string, value?: string): void
  toBeDisabled(): void
  toBeChecked(): void
  toHaveFocus(): void
}

type Expectation = Matchers & {
  not: Matchers
  resolves: { [K in keyof Matchers]: (...args: Parameters<Matchers[K]>) => Promise<void> }
  rejects: { [K in keyof Matchers]: (...args: Parameters<Matchers[K]>) => Promise<void> }
}

/** Проверка: [прошла ли, текст ошибки для обычного случая, текст для .not]. */
type Check = (actual: unknown, ...args: never[]) => [boolean, string, string]

const CHECKS: Record<keyof Matchers, Check> = {
  toBe: (actual, expected: unknown) => [Object.is(actual, expected), `Ожидалось ${show(expected)}, получено ${show(actual)}`, `Ожидалось значение, отличное от ${show(expected)}`],
  toEqual: (actual, expected: unknown) => [deepEqual(actual, expected), `Ожидалось ${show(expected)}, получено ${show(actual)}`, `Ожидалось значение, не равное ${show(expected)}`],
  toBeTruthy: (actual) => [Boolean(actual), `Ожидалось истинное значение, получено ${show(actual)}`, `Ожидалось ложное значение, получено ${show(actual)}`],
  toBeFalsy: (actual) => [!actual, `Ожидалось ложное значение, получено ${show(actual)}`, `Ожидалось истинное значение, получено ${show(actual)}`],
  toBeUndefined: (actual) => [actual === undefined, `Ожидалось undefined, получено ${show(actual)}`, 'Ожидалось значение, отличное от undefined'],
  toBeNull: (actual) => [actual === null, `Ожидалось null, получено ${show(actual)}`, 'Ожидалось значение, отличное от null'],
  toContain: (actual, expected: unknown) => {
    const has = typeof actual === 'string' ? actual.includes(String(expected)) : Array.isArray(actual) && actual.includes(expected)
    return [has, `Ожидалось, что ${show(actual)} содержит ${show(expected)}`, `Ожидалось, что ${show(actual)} не содержит ${show(expected)}`]
  },
  toHaveLength: (actual, expected: number) => {
    const length = (actual as { length?: unknown } | null)?.length
    return [length === expected, `Ожидалась длина ${expected}, получено ${show(length)}`, `Ожидалась длина, отличная от ${expected}`]
  },
  toBeGreaterThan: (actual, expected: number) => [(actual as number) > expected, `Ожидалось больше ${expected}, получено ${show(actual)}`, `Ожидалось не больше ${expected}, получено ${show(actual)}`],
  toBeLessThan: (actual, expected: number) => [(actual as number) < expected, `Ожидалось меньше ${expected}, получено ${show(actual)}`, `Ожидалось не меньше ${expected}, получено ${show(actual)}`],
  toBeCloseTo: (actual, expected: number, digits: number = 2) => [
    Math.abs((actual as number) - expected) < 10 ** -digits / 2,
    `Ожидалось примерно ${expected}, получено ${show(actual)}`,
    `Ожидалось значение, не близкое к ${expected}`,
  ],
  toBeInstanceOf: (actual, expected: abstract new (...args: never[]) => unknown) => [
    actual instanceof expected,
    `Ожидался экземпляр ${expected.name}, получено ${show(actual)}`,
    `Ожидалось, что значение не экземпляр ${expected.name}`,
  ],
  // Проверки элементов DOM для React-задач. Без зависимости от DOM: смотрят на свойства элемента.
  toBeInTheDocument: (actual) => [Boolean((actual as Node | null)?.isConnected), `Ожидалось, что элемент есть на странице, получено ${describe(actual)}`, `Ожидалось, что элемента нет на странице: ${describe(actual)}`],
  toHaveTextContent: (actual, expected: string | RegExp) => {
    const text = ((actual as Node | null)?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const has = typeof expected === 'string' ? text.includes(expected) : expected.test(text)
    return [has, `Ожидался текст ${show(expected)}, на элементе ${show(text)}`, `Не ожидался текст ${show(expected)}, на элементе ${show(text)}`]
  },
  toHaveValue: (actual, expected: unknown) => {
    const value = (actual as HTMLInputElement | null)?.value
    return [Object.is(value, expected), `Ожидалось значение ${show(expected)}, у поля ${show(value)}`, `Ожидалось значение, отличное от ${show(expected)}`]
  },
  toHaveAttribute: (actual, name: string, value?: string) => {
    const got = (actual as Element | null)?.getAttribute?.(name) ?? null
    const pass = got !== null && (value === undefined || got === value)
    const wanted = value === undefined ? name : `${name}=${show(value)}`
    return [pass, `Ожидался атрибут ${wanted}, получено ${got === null ? 'нет атрибута' : show(got)}`, `Не ожидался атрибут ${wanted}`]
  },
  toBeDisabled: (actual) => [Boolean((actual as HTMLButtonElement | null)?.disabled), `Ожидалось, что элемент недоступен: ${describe(actual)}`, `Ожидалось, что элемент доступен: ${describe(actual)}`],
  toBeChecked: (actual) => [Boolean((actual as HTMLInputElement | null)?.checked), `Ожидалось, что элемент отмечен: ${describe(actual)}`, `Ожидалось, что элемент не отмечен: ${describe(actual)}`],
  toHaveFocus: (actual) => {
    const element = actual as Element | null
    return [Boolean(element) && element!.ownerDocument?.activeElement === element, `Ожидался фокус на ${describe(actual)}`, `Не ожидался фокус на ${describe(actual)}`]
  },
  toThrow: (actual, expected?: string | RegExp) => {
    if (typeof actual !== 'function') return [false, 'toThrow ожидает функцию: expect(() => код).toThrow()', 'toThrow ожидает функцию: expect(() => код).toThrow()']
    let thrown: unknown
    let didThrow = false
    try {
      actual()
    } catch (error) {
      didThrow = true
      thrown = error
    }
    return throwCheck(didThrow, thrown, expected)
  },
}

function throwCheck(didThrow: boolean, thrown: unknown, expected?: string | RegExp): [boolean, string, string] {
  if (!didThrow) return [false, 'Ожидалась ошибка, но код выполнился без неё', 'Ошибки не ожидалось']
  const message = thrown instanceof Error ? thrown.message : String(thrown)
  const matches = expected === undefined || (typeof expected === 'string' ? message.includes(expected) : expected.test(message))
  return [matches, `Ожидалась ошибка ${show(expected)}, получена ${show(message)}`, `Ошибки не ожидалось, получена ${show(message)}`]
}

function makeMatchers(actual: unknown, negate: boolean): Matchers {
  const matchers = {} as Record<keyof Matchers, (...args: never[]) => void>
  for (const [name, check] of Object.entries(CHECKS) as [keyof Matchers, Check][]) {
    matchers[name] = (...args: never[]) => {
      const [pass, message, negated] = check(actual, ...args)
      if (pass === negate) throw new AssertionError(negate ? negated : message)
    }
  }
  return matchers as Matchers
}

export function expect(actual: unknown): Expectation {
  const settle = (mode: 'resolves' | 'rejects') => {
    const wrapped = {} as Record<keyof Matchers, (...args: never[]) => Promise<void>>
    for (const name of Object.keys(CHECKS) as (keyof Matchers)[]) {
      wrapped[name] = async (...args: never[]) => {
        let value: unknown
        let rejected = false
        try {
          value = await actual
        } catch (error) {
          rejected = true
          value = error
        }
        if (mode === 'resolves' && rejected) throw new AssertionError(`Ожидалось успешное выполнение, промис отклонён: ${show(value)}`)
        if (mode === 'rejects' && !rejected) throw new AssertionError(`Ожидалось отклонение промиса, он выполнился со значением ${show(value)}`)
        // Для rejects.toThrow сравниваем текст ошибки, как у синхронного toThrow.
        if (name === 'toThrow') {
          const [pass, message] = throwCheck(true, value, args[0] as string | RegExp | undefined)
          if (!pass) throw new AssertionError(message)
          return
        }
        ;(makeMatchers(value, false)[name] as (...inner: never[]) => void)(...args)
      }
    }
    return wrapped as Expectation['resolves']
  }
  return { ...makeMatchers(actual, false), not: makeMatchers(actual, true), resolves: settle('resolves'), rejects: settle('rejects') }
}

/** Функция-шпион для тестов: запоминает аргументы каждого вызова. */
export function spy<A extends unknown[], R>(impl?: (...args: A) => R) {
  const calls: A[] = []
  const fn = (...args: A) => {
    calls.push(args)
    return impl?.(...args)
  }
  return Object.assign(fn, { calls })
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// ── Помощники для тестов задач (docs/TRAINERS.md) ─────────────────────────────────────────
// Доступны в тестах любой задачи наравне с test, expect, spy и sleep: короткие тесты, а темы браузера
// (воркеры, окна, наблюдатели) проверяются без настоящего браузера.

/** Промис с внешними resolve и reject — как Promise.withResolvers, но с явным состоянием для проверок. */
export function deferred<T = unknown>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const state = { settled: false }
  const promise = new Promise<T>((res, rej) => {
    resolve = (value) => {
      state.settled = true
      res(value)
    }
    reject = (reason) => {
      state.settled = true
      rej(reason)
    }
  })
  return Object.assign(state, { promise, resolve, reject })
}

/**
 * Асинхронная функция, которая первые failTimes вызовов отклоняется с Error(`сбой ${номер вызова}`),
 * а потом возвращает value. calls — аргументы каждого вызова.
 */
export function flaky<T>(failTimes: number, value?: T) {
  const calls: unknown[][] = []
  const fn = async (...args: unknown[]) => {
    calls.push(args)
    if (calls.length <= failTimes) throw new Error(`сбой ${calls.length}`)
    return value
  }
  return Object.assign(fn, { calls })
}

/** Счётчик одновременных вызовов: track(fn) оборачивает асинхронную функцию, peak — наибольшее число одновременно идущих. */
export function concurrency() {
  const stats = { active: 0, peak: 0 }
  const track =
    <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
    async (...args: A) => {
      stats.active++
      stats.peak = Math.max(stats.peak, stats.active)
      try {
        return await fn(...args)
      } finally {
        stats.active--
      }
    }
  return Object.assign(stats, { track })
}

type Listener = (event: { data: unknown; origin?: string; source?: unknown }) => void

/** Объект с addEventListener / removeEventListener / onmessage для событий message. */
function messageTarget() {
  const listeners = new Set<Listener>()
  const target = {
    onmessage: null as Listener | null,
    addEventListener: (type: string, listener: Listener) => void (type === 'message' && listeners.add(listener)),
    removeEventListener: (type: string, listener: Listener) => void (type === 'message' && listeners.delete(listener)),
    /** Доставить событие: как в браузере — отдельной задачей и копией данных (структурированное клонирование). */
    deliver(event: { data: unknown; origin?: string; source?: unknown }) {
      const copy = { ...event, data: structuredClone(event.data) }
      setTimeout(() => {
        target.onmessage?.(copy)
        for (const listener of [...listeners]) listener(copy)
      }, 0)
    },
  }
  return target
}

/**
 * Пара «страница ↔ воркер» без настоящего воркера. worker.postMessage доставляет сообщение в scope (как self внутри воркера),
 * scope.postMessage — обратно в worker. Данные копируются, доставка — отдельной задачей. После terminate() сообщения не идут.
 */
export function fakeWorker() {
  let alive = true
  const worker = messageTarget()
  const scope = messageTarget()
  const posted: unknown[] = []
  return {
    worker: Object.assign(worker, {
      postMessage(data: unknown) {
        posted.push(data)
        if (alive) scope.deliver({ data })
      },
      terminate: () => void (alive = false),
    }),
    scope: Object.assign(scope, { postMessage: (data: unknown) => void (alive && worker.deliver({ data })) }),
    /** Всё, что страница отправила в воркер. */
    posted,
  }
}

/**
 * Два окна разных origin, например страница и iframe. a.postMessage(data, targetOrigin) доставляет сообщение в b,
 * только если targetOrigin — '*' или origin окна b; событие несёт origin и source отправителя.
 */
export function fakeWindows(originA = 'https://app.example', originB = 'https://widget.example') {
  type FakeWindow = ReturnType<typeof messageTarget> & { origin: string; postMessage(data: unknown, targetOrigin: string): void }
  const make = (origin: string) => Object.assign(messageTarget(), { origin }) as FakeWindow
  const a = make(originA)
  const b = make(originB)
  for (const [from, to] of [
    [a, b],
    [b, a],
  ] as const) {
    from.postMessage = (data, targetOrigin) => {
      if (targetOrigin !== '*' && targetOrigin !== to.origin) return
      to.deliver({ data, origin: from.origin, source: from })
    }
  }
  return { a, b }
}

/**
 * Управляемый наблюдатель вместо IntersectionObserver, ResizeObserver или MutationObserver.
 * Observer — класс с observe / unobserve / disconnect; trigger(target, entry) вызывает колбэки тех экземпляров,
 * что наблюдают за target. instances — все созданные экземпляры.
 */
export function fakeObserver() {
  type Callback = (entries: Record<string, unknown>[], observer: unknown) => void
  const instances: { callback: Callback; targets: Set<unknown>; options: unknown; disconnected: boolean }[] = []
  class Observer {
    #self: (typeof instances)[number]
    constructor(callback: Callback, options?: unknown) {
      this.#self = { callback, targets: new Set(), options, disconnected: false }
      instances.push(this.#self)
    }
    observe(target: unknown) {
      this.#self.disconnected = false
      this.#self.targets.add(target)
    }
    unobserve(target: unknown) {
      this.#self.targets.delete(target)
    }
    disconnect() {
      this.#self.targets.clear()
      this.#self.disconnected = true
    }
    takeRecords() {
      return []
    }
  }
  const observers = new WeakMap<(typeof instances)[number], Observer>()
  const Tracked = new Proxy(Observer, {
    construct(Target, args) {
      const observer = new Target(...(args as [Callback, unknown]))
      observers.set(instances.at(-1)!, observer)
      return observer
    },
  })
  return {
    Observer: Tracked,
    instances,
    /** Сообщить наблюдателям за target о записи entry. Возвращает, скольких колбэков это коснулось. */
    trigger(target: unknown, entry: Record<string, unknown> = {}) {
      const watching = instances.filter((item) => item.targets.has(target))
      for (const item of watching) item.callback([{ target, ...entry }], observers.get(item))
      return watching.length
    },
  }
}

/** Все помощники по именам — в таком виде их получают тесты задач. */
export const HELPERS = { deferred, flaky, concurrency, fakeWorker, fakeWindows, fakeObserver }

/** Решения пишут как модуль: `export function …`. В общей области видимости с тестами export не нужен. */
function stripExports(code: string) {
  return code.replace(/^(\s*)export\s+(default\s+)?(?=(async\s+)?function|const|let|var|class)/gm, '$1')
}

const TIMEOUT = Symbol('timeout')

export async function runCode(code: string, tests: string, { testTimeoutMs = 2000, globals = {}, afterEach }: RunOptions = {}): Promise<RunResult> {
  const logs: string[] = []
  const log = (...args: unknown[]) => void logs.push(formatLog(args))
  const sandboxConsole = { log, info: log, warn: log, error: log, debug: log }
  const cases: { name: string; fn: () => unknown }[] = []
  const test = (name: string, fn: () => unknown) => void cases.push({ name, fn })

  // Код и тесты — внутри блока: так решение может объявить своё `render` или `test`, не конфликтуя с параметрами.
  let program: (...args: unknown[]) => void
  try {
    program = new Function('test', 'expect', 'spy', 'sleep', 'console', ...Object.keys(HELPERS), ...Object.keys(globals), `"use strict";\n{\n${stripExports(code)}\n;\n${tests}\n}`) as typeof program
  } catch (error) {
    return { status: 'error', tests: [], logs, error: `Синтаксическая ошибка: ${(error as Error).message}` }
  }

  try {
    program(test, expect, spy, sleep, sandboxConsole, ...Object.values(HELPERS), ...Object.values(globals))
  } catch (error) {
    return { status: 'error', tests: [], logs, error: show(error) }
  }

  const results: TestResult[] = []
  for (const { name, fn } of cases) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const outcome = await Promise.race([
        Promise.resolve().then(fn),
        new Promise((resolve) => (timer = setTimeout(() => resolve(TIMEOUT), testTimeoutMs))),
      ])
      results.push(outcome === TIMEOUT ? { name, passed: false, error: `Тест не завершился за ${testTimeoutMs / 1000} с: промис так и не выполнился?` } : { name, passed: true })
    } catch (error) {
      results.push({ name, passed: false, error: error instanceof AssertionError ? error.message : show(error) })
    } finally {
      clearTimeout(timer)
      try {
        await afterEach?.()
      } catch (error) {
        // Например, компонент упал при размонтировании: следующий тест всё равно должен выполниться.
        logs.push(`Ошибка при уборке после теста «${name}»: ${show(error)}`)
      }
    }
  }
  return { status: 'ok', tests: results, logs }
}

/** Задача решена, если тесты есть и все пройдены. */
export function isSolved(result: RunResult) {
  return result.status === 'ok' && result.tests.length > 0 && result.tests.every((item) => item.passed)
}
