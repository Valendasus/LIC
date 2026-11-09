import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CompilerRequest, CompilerResponse } from '@/features/solve-task/lib/compiler'

type Behaviour = (request: CompilerRequest, worker: FakeWorker) => void

class FakeWorker {
  static created: FakeWorker[] = []
  static behaviour: Behaviour = () => {}
  onmessage: ((event: MessageEvent<CompilerResponse>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false
  constructor(
    public url: URL,
    public options: WorkerOptions,
  ) {
    FakeWorker.created.push(this)
  }
  postMessage(request: CompilerRequest) {
    FakeWorker.behaviour(request, this)
  }
  reply(data: CompilerResponse) {
    queueMicrotask(() => this.onmessage?.({ data } as MessageEvent<CompilerResponse>))
  }
  fail(message: string) {
    this.onerror?.({ message, preventDefault: vi.fn() } as unknown as ErrorEvent)
  }
  terminate() {
    this.terminated = true
  }
}

const ok = { status: 'ok' as const, tests: [{ name: 't', passed: true }], logs: [] }

// Модуль хранит воркер между запросами — каждый тест начинает с чистого модуля.
async function load() {
  vi.resetModules()
  return import('@/features/solve-task/lib/compiler')
}

beforeEach(() => {
  FakeWorker.created = []
  vi.stubGlobal('Worker', FakeWorker)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('воркер компилятора', () => {
  it('один воркер на все запросы; ответы по id', async () => {
    FakeWorker.behaviour = (request, worker) =>
      request.op === 'types'
        ? worker.reply({ id: request.id, op: 'types', result: ok })
        : worker.reply({ id: request.id, op: 'react', result: { code: `${request.code}|${request.preview}` } })
    const { checkTypesInWorker, compileReactInWorker, COMPILER_TIMEOUT_MS } = await load()
    expect(COMPILER_TIMEOUT_MS).toBe(20_000)
    expect(await checkTypesInWorker('type A = 1', 'tests')).toEqual(ok)
    expect(await compileReactInWorker('код', 'тесты', '<A />')).toEqual({ code: 'код|<A />' })
    expect(FakeWorker.created).toHaveLength(1)
    expect(FakeWorker.created[0].url.pathname).toMatch(/compiler\.worker\.ts$/)
    expect(FakeWorker.created[0].options).toEqual({ type: 'module' })
  })

  it('ошибка внутри воркера приходит как результат', async () => {
    FakeWorker.behaviour = (request, worker) => worker.reply({ id: request.id, op: 'failed', error: 'TypeError: сеть' })
    const { checkTypesInWorker, compileReactInWorker } = await load()
    expect(await checkTypesInWorker('', '')).toEqual({ status: 'error', tests: [], logs: [], error: 'TypeError: сеть' })
    expect(await compileReactInWorker('', '')).toEqual({ error: 'TypeError: сеть' })
  })

  it('воркер упал при загрузке: ожидающие запросы завершаются, следующий создаёт новый воркер', async () => {
    FakeWorker.behaviour = (_request, worker) => queueMicrotask(() => worker.fail('Ошибка загрузки модуля'))
    const { checkTypesInWorker } = await load()
    expect(await checkTypesInWorker('', '')).toMatchObject({ status: 'error', error: 'Ошибка загрузки модуля' })
    expect(FakeWorker.created[0].terminated).toBe(true)

    FakeWorker.behaviour = (_request, worker) => queueMicrotask(() => worker.fail(''))
    expect(await checkTypesInWorker('', '')).toMatchObject({ error: 'Компилятор не загрузился' })
    expect(FakeWorker.created).toHaveLength(2)
  })

  it('нет ответа — воркер останавливается по таймеру', async () => {
    vi.useFakeTimers()
    FakeWorker.behaviour = () => {}
    const { compileReactInWorker } = await load()
    const pending = compileReactInWorker('', '', undefined, 1000)
    vi.advanceTimersByTime(1000)
    expect(await pending).toEqual({ error: 'Компилятор не ответил за 1 с' })
    expect(FakeWorker.created[0].terminated).toBe(true)
  })

  it('ответ на неизвестный запрос игнорируется', async () => {
    FakeWorker.behaviour = (request, worker) => {
      worker.reply({ id: 999, op: 'types', result: ok })
      worker.reply({ id: request.id, op: 'types', result: ok })
    }
    const { checkTypesInWorker } = await load()
    expect(await checkTypesInWorker('', '')).toEqual(ok)
  })
})

describe('код воркера компилятора', () => {
  async function loadWorker(fetchImpl: () => Promise<unknown>) {
    vi.resetModules()
    const listeners: Record<string, (event: MessageEvent) => Promise<void>> = {}
    const postMessage = vi.fn()
    vi.stubGlobal('self', { addEventListener: (type: string, fn: never) => (listeners[type] = fn), postMessage })
    const fetchMock = vi.fn(fetchImpl)
    vi.stubGlobal('fetch', fetchMock)
    vi.doMock('@/features/solve-task/lib/type-checker', () => ({ checkTypes: vi.fn((_ts, code: string, _tests, libs) => ({ status: 'ok', tests: [], logs: [code, Object.keys(libs).join()] })) }))
    vi.doMock('@/features/solve-task/lib/react-compile', () => ({ compileReact: vi.fn((_ts, code: string, tests: string, preview?: string) => ({ code: `${code}${tests}${preview}` })) }))
    await import('@/features/solve-task/lib/compiler.worker')
    const send = (data: CompilerRequest) => listeners.message({ data } as MessageEvent)
    return { send, postMessage, fetchMock }
  }
  afterEach(() => {
    vi.doUnmock('@/features/solve-task/lib/type-checker')
    vi.doUnmock('@/features/solve-task/lib/react-compile')
  })

  it('типы: библиотека загружается один раз; React: сборка', async () => {
    const { send, postMessage, fetchMock } = await loadWorker(async () => ({ json: async () => ({ 'lib.es5.d.ts': '' }) }))
    await send({ id: 1, op: 'types', code: 'A', tests: '' })
    await send({ id: 2, op: 'types', code: 'B', tests: '' })
    await send({ id: 3, op: 'react', code: 'x', tests: 'y', preview: 'z' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/ts-lib')
    expect(postMessage.mock.calls.map(([response]) => response)).toEqual([
      { id: 1, op: 'types', result: { status: 'ok', tests: [], logs: ['A', 'lib.es5.d.ts'] } },
      { id: 2, op: 'types', result: { status: 'ok', tests: [], logs: ['B', 'lib.es5.d.ts'] } },
      { id: 3, op: 'react', result: { code: 'xyz' } },
    ])
  })

  it('библиотека не загрузилась — ошибка, следующий запуск пробует снова', async () => {
    let attempt = 0
    const { send, postMessage, fetchMock } = await loadWorker(async () => {
      if (++attempt === 1) throw new TypeError('Failed to fetch')
      return { json: async () => ({}) }
    })
    await send({ id: 1, op: 'types', code: '', tests: '' })
    expect(postMessage).toHaveBeenLastCalledWith({ id: 1, op: 'failed', error: 'TypeError: Failed to fetch' })
    await send({ id: 2, op: 'types', code: '', tests: '' })
    expect(postMessage).toHaveBeenLastCalledWith({ id: 2, op: 'types', result: { status: 'ok', tests: [], logs: ['', ''] } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
