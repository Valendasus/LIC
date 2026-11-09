/**
 * Выполнение собранной React-задачи: тесты на Testing Library и user-event, затем предпросмотр.
 *
 * Модуль получает React, react-dom и Testing Library снаружи. В браузере их передаёт песочница (/sandbox),
 * в тестах платформы — jsdom-окружение Vitest: так эталоны всех React-задач проверяются автоматически.
 */
import { runCode, type RunResult } from './code-runner'
import { loopLimit } from './react-compile'

type Library = Record<string, unknown>

interface Root {
  render(node: unknown): void
  unmount(): void
}

export interface ReactDeps {
  React: Library
  /** createRoot из react-dom/client и flushSync из react-dom. */
  createRoot: (container: Element, options?: { onUncaughtError?: (error: unknown) => void }) => Root
  flushSync: (fn: () => void) => void
  /** @testing-library/dom: screen, fireEvent, waitFor, within. */
  dom: Library
  userEvent: Library
}

/** Что из React доступно без импорта: все хуки и основные функции. */
const REACT_GLOBALS = ['memo', 'forwardRef', 'createContext', 'Fragment', 'Suspense', 'lazy', 'startTransition', 'StrictMode', 'Activity']
/** Что из Testing Library доступно без импорта. */
const DOM_GLOBALS = ['screen', 'fireEvent', 'waitFor', 'within']

/**
 * render и renderHook в духе React Testing Library, но без act: в продакшен-сборке React его нет,
 * а песочница работает именно на ней. Рендер синхронный через flushSync, события user-event
 * обрабатываются React сразу, эффекты — асинхронно, их ждут через waitFor.
 */
export function createTestingApi({ createRoot, flushSync }: Pick<ReactDeps, 'createRoot' | 'flushSync'>, createElement: (type: unknown, props?: unknown) => unknown) {
  const mounted = new Set<{ root: Root; container: HTMLElement }>()

  function render(ui: unknown) {
    const container = document.createElement('div')
    document.body.append(container)
    // Ошибку рендера React 19 не бросает наружу, а передаёт в onUncaughtError. Ловим её и бросаем из render:
    // тогда тест падает с настоящей причиной («цикл остановлен», «x is not defined»), а не с «элемент не найден».
    let failure: { error: unknown } | null = null
    const root = createRoot(container, { onUncaughtError: (error) => (failure ??= { error }) })
    const entry = { root, container }
    mounted.add(entry)
    const commit = (node: unknown) => {
      flushSync(() => root.render(node))
      if (failure) {
        const { error } = failure
        failure = null
        throw error
      }
    }
    commit(ui)
    return {
      container,
      rerender: commit,
      unmount: () => {
        root.unmount()
        container.remove()
        mounted.delete(entry)
      },
    }
  }

  function renderHook<P, R>(hook: (props: P) => R, { initialProps }: { initialProps?: P } = {}) {
    const result = { current: undefined as R }
    function Probe({ props }: { props: P }) {
      result.current = hook(props)
      return null
    }
    const view = render(createElement(Probe, { props: initialProps }))
    return { result, rerender: (props: P) => view.rerender(createElement(Probe, { props })), unmount: view.unmount }
  }

  /** Выполнить действие и дать React обработать обновления и эффекты. */
  async function act(action: () => unknown) {
    let value: unknown
    flushSync(() => {
      value = action()
    })
    await value
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  function cleanup() {
    for (const { root, container } of mounted) {
      root.unmount()
      container.remove()
    }
    mounted.clear()
  }

  return { render, renderHook, act, cleanup }
}

export interface ReactRunResult {
  result: RunResult
  /** Функция предпросмотра из exports.__licPreview, если задача её объявила. */
  preview?: () => unknown
}

export async function runReactTask(compiled: string, deps: ReactDeps): Promise<ReactRunResult> {
  const { React, dom, userEvent } = deps
  const testing = createTestingApi(deps, React.createElement as (type: unknown, props?: unknown) => unknown)
  const testingLibrary = { ...dom, ...testing }
  const modules: Record<string, unknown> = {
    react: React,
    '@testing-library/react': testingLibrary,
    '@testing-library/dom': dom,
    '@testing-library/user-event': userEvent,
  }
  const require = (name: string) => {
    if (!(name in modules)) throw new Error(`Модуль «${name}» в задаче недоступен. Доступны: ${Object.keys(modules).join(', ')}`)
    return modules[name]
  }
  const exports: Record<string, unknown> = {}
  const pick = (library: Library, names: string[]) => Object.fromEntries(names.filter((name) => name in library).map((name) => [name, library[name]]))

  const globals = {
    React,
    ...pick(React, Object.keys(React).filter((name) => /^use[A-Z]/.test(name))),
    ...pick(React, REACT_GLOBALS),
    ...pick(dom, DOM_GLOBALS),
    render: testing.render,
    renderHook: testing.renderHook,
    act: testing.act,
    userEvent: (userEvent as { default?: unknown }).default ?? userEvent,
    require,
    exports,
    module: { exports },
    __loopLimit: loopLimit,
  }
  const result = await runCode(compiled, '', { globals, afterEach: testing.cleanup, testTimeoutMs: 4000 })
  const preview = typeof exports.__licPreview === 'function' ? (exports.__licPreview as () => unknown) : undefined
  return { result, preview }
}
