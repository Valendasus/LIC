import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCode, type RunResult } from '@/features/solve-task/lib/code-runner'
import { RUN_TIMEOUT_MS, runInWorker } from '@/features/solve-task/lib/run'

/** Подмена Web Worker: выполняет то же ядро, но в этом же потоке. Поведение задаётся сценарием. */
function installWorker(scenario: 'run' | 'hang' | 'crash' | 'crash-silent') {
  const created: FakeWorker[] = []
  class FakeWorker {
    onmessage: ((event: MessageEvent<RunResult>) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    terminated = false
    constructor(
      public url: URL,
      public options: WorkerOptions,
    ) {
      created.push(this)
    }
    postMessage({ code, tests }: { code: string; tests: string }) {
      if (scenario === 'run') void runCode(code, tests).then((data) => this.onmessage?.({ data } as MessageEvent<RunResult>))
      if (scenario.startsWith('crash')) {
        const event = { message: scenario === 'crash' ? 'Ошибка загрузки' : '', preventDefault: vi.fn() } as unknown as ErrorEvent
        queueMicrotask(() => this.onerror?.(event))
      }
    }
    terminate() {
      this.terminated = true
    }
  }
  vi.stubGlobal('Worker', FakeWorker)
  return created
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('запуск решения в воркере', () => {
  it('отдаёт результат и останавливает воркер; воркер — модуль из runner.worker.ts', async () => {
    const created = installWorker('run')
    const result = await runInWorker('const a = 1', "test('t', () => expect(a).toBe(1))")
    expect(result.tests).toEqual([{ name: 't', passed: true }])
    expect(created).toHaveLength(1)
    expect(created[0].url.pathname).toMatch(/runner\.worker\.ts$/)
    expect(created[0].options).toEqual({ type: 'module' })
    expect(created[0].terminated).toBe(true)
  })

  it('бесконечный цикл: воркер останавливается по таймеру', async () => {
    vi.useFakeTimers()
    const created = installWorker('hang')
    expect(RUN_TIMEOUT_MS).toBe(5000)
    const pending = runInWorker('while (true) {}', '')
    vi.advanceTimersByTime(RUN_TIMEOUT_MS)
    expect(await pending).toEqual({
      status: 'timeout',
      tests: [],
      logs: [],
      error: 'Код выполнялся дольше 5 с и был остановлен. Проверьте циклы и условия выхода из рекурсии.',
    })
    expect(created[0].terminated).toBe(true)
  })

  it('ошибка самого воркера превращается в понятный результат', async () => {
    installWorker('crash')
    expect(await runInWorker('', '')).toMatchObject({ status: 'error', error: 'Ошибка загрузки' })
    installWorker('crash-silent')
    expect(await runInWorker('', '', 100)).toMatchObject({ status: 'error', error: 'Не удалось запустить проверку' })
  })
})

describe('воркер', () => {
  it('выполняет присланный код и глушит необработанные отклонения решения', async () => {
    const listeners: Record<string, (event: never) => unknown> = {}
    const postMessage = vi.fn()
    vi.stubGlobal('self', { addEventListener: (type: string, fn: (event: never) => unknown) => (listeners[type] = fn), postMessage })
    await import('@/features/solve-task/lib/runner.worker')

    const rejection = { preventDefault: vi.fn() }
    listeners.unhandledrejection(rejection as never)
    expect(rejection.preventDefault).toHaveBeenCalled()

    await listeners.message({ data: { code: 'const x = 2', tests: "test('t', () => expect(x).toBe(2))" } } as never)
    expect(postMessage).toHaveBeenCalledWith({ status: 'ok', tests: [{ name: 't', passed: true }], logs: [] })
  })
})
