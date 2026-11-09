// @vitest-environment jsdom
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/solve-task/lib/react-runner', () => ({ runReactTask: vi.fn() }))

import { SandboxRuntime } from '@/features/solve-task/ui/SandboxRuntime'
import { SANDBOX_TIMEOUT_MS, useSandbox } from '@/features/solve-task/model/useSandbox'
import { runReactTask } from '@/features/solve-task/lib/react-runner'
import type { RunResult } from '@/features/solve-task/lib/code-runner'

const runTask = vi.mocked(runReactTask)
const ok: RunResult = { status: 'ok', tests: [{ name: 't', passed: true }], logs: [] }

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Сообщение «от iframe»: source — его окно, адрес — наш. */
function fromFrame(frame: HTMLIFrameElement, data: unknown, origin = window.location.origin) {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: frame.contentWindow }))
}

describe('песочница на странице задачи', () => {
  function Host({ onResult }: { onResult: (result: RunResult) => void }) {
    const sandbox = useSandbox(1000)
    return (
      <div>
        <button onClick={() => sandbox.run('собранный код').then(onResult)}>run</button>
        {sandbox.frame}
      </div>
    )
  }

  it('до запуска iframe нет; запуск создаёт iframe, ждёт готовности, отправляет код, получает результат', async () => {
    expect(SANDBOX_TIMEOUT_MS).toBe(15_000)
    const onResult = vi.fn()
    render(<Host onResult={onResult} />)
    expect(document.querySelector('iframe')).toBeNull()

    act(() => screen.getByText('run').click())
    const frame = document.querySelector('iframe')!
    expect(frame).toHaveAttribute('src', '/sandbox')
    expect(frame).toHaveAttribute('title', 'Предпросмотр компонента')
    const post = vi.spyOn(frame.contentWindow!, 'postMessage')

    // Чужие сообщения не принимаются: другой адрес, другое окно.
    fromFrame(frame, { type: 'lic-sandbox-ready' }, 'https://evil.example')
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'lic-sandbox-ready' }, origin: window.location.origin, source: window }))
    expect(post).not.toHaveBeenCalled()

    fromFrame(frame, { type: 'lic-sandbox-ready' })
    expect(post).toHaveBeenCalledWith({ type: 'lic-sandbox-run', id: 1, code: 'собранный код' }, window.location.origin)
    // Повторное «готова» (StrictMode в разработке) не отправляет код второй раз.
    fromFrame(frame, { type: 'lic-sandbox-ready' })
    expect(post).toHaveBeenCalledTimes(1)

    // Результат с чужим id не принимается.
    fromFrame(frame, { type: 'lic-sandbox-result', id: 7, result: ok })
    expect(onResult).not.toHaveBeenCalled()
    fromFrame(frame, { type: 'lic-sandbox-result', id: 1, result: ok })
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(ok))

    // После результата сообщения игнорируются.
    fromFrame(frame, { type: 'lic-sandbox-result', id: 1, result: ok })
    expect(onResult).toHaveBeenCalledTimes(1)
  })

  it('каждый запуск — новый iframe', () => {
    render(<Host onResult={vi.fn()} />)
    act(() => screen.getByText('run').click())
    const first = document.querySelector('iframe')
    act(() => screen.getByText('run').click())
    expect(document.querySelector('iframe')).not.toBe(first)
  })

  it('песочница не ответила — таймаут', async () => {
    vi.useFakeTimers()
    const onResult = vi.fn()
    render(<Host onResult={onResult} />)
    act(() => screen.getByText('run').click())
    await act(async () => vi.advanceTimersByTime(1000))
    expect(onResult).toHaveBeenCalledWith({ status: 'timeout', tests: [], logs: [], error: 'Песочница не ответила за 1 с.' })
  })

  it('таймаут по умолчанию', () => {
    const { result } = renderHook(() => useSandbox())
    expect(result.current.frame).toBeNull()
  })
})

describe('песочница внутри iframe', () => {
  /** В jsdom у верхнего окна parent — оно само: сообщения «от родителя» шлём от window. */
  const fromParent = (data: unknown, origin = window.location.origin) => window.dispatchEvent(new MessageEvent('message', { data, origin, source: window }))

  it('сообщает о готовности, выполняет задачу, рисует предпросмотр и отвечает результатом', async () => {
    const post = vi.spyOn(window, 'postMessage')
    runTask.mockResolvedValue({ result: ok, preview: () => <p>предпросмотр</p> })
    const { container } = render(<SandboxRuntime />)
    expect(post).toHaveBeenCalledWith({ type: 'lic-sandbox-ready' }, window.location.origin)
    expect(container.querySelector('[data-sandbox="idle"]')).not.toBeNull()

    // Чужие сообщения игнорируются.
    fromParent({ type: 'lic-sandbox-run', id: 1, code: 'x' }, 'https://evil.example')
    fromParent({ type: 'другое' })
    fromParent(null)
    expect(runTask).not.toHaveBeenCalled()

    await act(async () => fromParent({ type: 'lic-sandbox-run', id: 5, code: 'код' }))
    expect(runTask).toHaveBeenCalledWith('код', expect.objectContaining({ createRoot: expect.any(Function), flushSync: expect.any(Function) }))
    await waitFor(() => expect(post).toHaveBeenCalledWith({ type: 'lic-sandbox-result', id: 5, result: ok }, window.location.origin))
    expect(await screen.findByText('предпросмотр')).toBeInTheDocument()
    expect(container.querySelector('[data-sandbox="done"]')).not.toBeNull()
  })

  it('пока идут тесты — подпись; упавший предпросмотр — сообщение', async () => {
    let finish!: (value: Awaited<ReturnType<typeof runReactTask>>) => void
    runTask.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    vi.spyOn(window, 'postMessage')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<SandboxRuntime />)
    await act(async () => fromParent({ type: 'lic-sandbox-run', id: 1, code: '' }))
    expect(screen.getByText('Выполняем тесты…')).toBeInTheDocument()
    const Broken = () => {
      throw new Error('бум')
    }
    // Без act: внутри act React перебрасывает ошибку рендера, а в настоящем iframe её получает onUncaughtError.
    finish({ result: ok, preview: () => <Broken /> })
    expect(await screen.findByRole('alert')).toHaveTextContent('Предпросмотр упал: Error: бум')
  })

  it('второй запуск в том же iframe переиспользует корень предпросмотра', async () => {
    vi.spyOn(window, 'postMessage')
    const error = vi.spyOn(console, 'error')
    runTask.mockResolvedValueOnce({ result: ok, preview: () => <p>первый</p> }).mockResolvedValueOnce({ result: ok, preview: () => <p>второй</p> })
    render(<SandboxRuntime />)
    await act(async () => fromParent({ type: 'lic-sandbox-run', id: 1, code: '' }))
    expect(await screen.findByText('первый')).toBeInTheDocument()
    await act(async () => fromParent({ type: 'lic-sandbox-run', id: 2, code: '' }))
    expect(await screen.findByText('второй')).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
  })

  it('без предпросмотра просто отвечает результатом', async () => {
    const post = vi.spyOn(window, 'postMessage')
    runTask.mockResolvedValue({ result: ok })
    const { unmount } = render(<SandboxRuntime />)
    await act(async () => fromParent({ type: 'lic-sandbox-run', id: 2, code: '' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith({ type: 'lic-sandbox-result', id: 2, result: ok }, window.location.origin))
    unmount()
  })
})
