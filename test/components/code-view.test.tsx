// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RunResult } from '@/features/solve-task/lib/code-runner'

// Редактор подменяем полем ввода: сам CodeMirror проверяется отдельно, здесь важна логика тренажёра.
vi.mock('@/features/solve-task/ui/CodeEditor', () => ({
  CodeEditor: ({ value, onChange, onRun, label, language }: { value: string; onChange: (v: string) => void; onRun: () => void; label: string; language: string }) => (
    <textarea aria-label={label} data-language={language} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && event.ctrlKey && onRun()} />
  ),
}))
vi.mock('@/features/solve-task/lib/run', () => ({ runInWorker: vi.fn() }))
vi.mock('@/features/solve-task/lib/compiler', () => ({ checkTypesInWorker: vi.fn(), compileReactInWorker: vi.fn() }))
const sandboxRun = vi.fn()
let sandboxFrame: React.ReactNode = null
vi.mock('@/features/solve-task/model/useSandbox', () => ({ useSandbox: () => ({ run: sandboxRun, frame: sandboxFrame }) }))
vi.mock('@/features/solve-task/api/actions', () => ({ revealSolution: vi.fn() }))

import { revealSolution } from '@/features/solve-task/api/actions'
import { codeGrade, CodeView } from '@/features/solve-task/ui/CodeView'
import { checkTypesInWorker, compileReactInWorker } from '@/features/solve-task/lib/compiler'
import { runInWorker } from '@/features/solve-task/lib/run'
import { code, intervals } from './fixtures'

const run = vi.mocked(runInWorker)
const reveal = vi.mocked(revealSolution)

const pass: RunResult = { status: 'ok', tests: [{ name: 'складывает', passed: true }], logs: [] }
const fail: RunResult = {
  status: 'ok',
  tests: [
    { name: 'складывает', passed: true },
    { name: 'с нулём', passed: false, error: 'Ожидалось 4, получено undefined' },
  ],
  logs: ['отладка 1'],
}

const props = (free = false) => ({ intervals: { ...intervals }, free, onGrade: vi.fn(), status: 'Новое' })
const editor = () => screen.getByRole('textbox', { name: 'Решение задачи «Сумма»' })
const runButton = () => screen.getByRole('button', { name: /Запустить тесты/ })

beforeEach(() => {
  run.mockReset()
  reveal.mockReset().mockResolvedValue({ solution: 'function sum(a, b) { return a + b }', explain: 'Разбор **эталона**.' })
  localStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('автооценка задачи', () => {
  it('открытое решение — «Снова», подсказки или неудачные запуски — «Трудно», иначе «Хорошо»', () => {
    expect(codeGrade({ gaveUp: true, hints: 0, failedRuns: 0 })).toBe(1)
    expect(codeGrade({ gaveUp: false, hints: 2, failedRuns: 0 })).toBe(2)
    expect(codeGrade({ gaveUp: false, hints: 0, failedRuns: 1 })).toBe(2)
    expect(codeGrade({ gaveUp: false, hints: 1, failedRuns: 0 })).toBe(3)
  })
})

describe('задача на код', () => {
  it('решена с первого запуска: «Хорошо», эталон и разбор, черновик удаляется', async () => {
    const user = userEvent.setup()
    const p = props()
    run.mockResolvedValue(pass)
    render(<CodeView item={code()} {...p} />)
    expect(screen.getByText('Задача · Лёгкая')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Сумма' })).toBeInTheDocument()
    expect(editor()).toHaveValue('function sum() {}')

    await user.type(editor(), ' // моё')
    expect(localStorage.getItem('lic:draft:f/t#code')).toBe('function sum() {} // моё')
    await user.click(runButton())
    expect(run).toHaveBeenCalledWith('function sum() {} // моё', "test('t', () => {})")

    expect(await screen.findByText('Решено')).toBeInTheDocument()
    expect(screen.getByText('с первого запуска')).toBeInTheDocument()
    expect(screen.getByText('Тесты: 1 из 1')).toHaveClass('text-good')
    expect(reveal).toHaveBeenCalledWith('f/t#code')
    expect(screen.getByText('Эталонное решение')).toBeInTheDocument()
    expect(screen.getByText('function sum(a, b) { return a + b }')).toBeInTheDocument()
    expect(screen.getByText('эталона')).toBeInTheDocument()
    // После решения подсказки, сброс и «Показать решение» уже не нужны.
    expect(screen.queryByRole('button', { name: /Подсказка/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Показать решение' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Сбросить к заготовке' })).toBeNull()

    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    expect(p.onGrade).toHaveBeenCalledWith(3)
    expect(screen.getByRole('button', { name: /Дальше/ })).toHaveTextContent('3 дн.')
    expect(localStorage.getItem('lic:draft:f/t#code')).toBeNull()
  })

  it('неудачный запуск: какие тесты не прошли, вывод console.log; решено потом — «Трудно»', async () => {
    const user = userEvent.setup()
    const p = props()
    run.mockResolvedValueOnce(fail).mockResolvedValue(pass)
    render(<CodeView item={code()} {...p} />)

    await user.click(runButton())
    expect(await screen.findByText('Тесты: 1 из 2')).toHaveClass('text-warn')
    expect(document.querySelector('[data-test-result="pass"]')).toHaveTextContent('складывает')
    expect(document.querySelector('[data-test-result="fail"]')).toHaveTextContent('с нулём')
    expect(screen.getByText('Ожидалось 4, получено undefined')).toBeInTheDocument()
    expect(screen.getByText('Вывод console.log')).toBeInTheDocument()
    expect(screen.getByText('отладка 1')).toBeInTheDocument()
    expect(screen.queryByText('Решено')).toBeNull()

    // Ctrl+Enter из редактора — тот же запуск.
    fireEvent.keyDown(editor(), { key: 'Enter', ctrlKey: true })
    expect(await screen.findByText('Решено')).toBeInTheDocument()
    expect(screen.getByText('с подсказками или не с первого запуска — вернётся раньше обычного')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    expect(p.onGrade).toHaveBeenCalledWith(2)
  })

  it('подсказки открываются по одной; две подсказки — «Трудно»', async () => {
    const user = userEvent.setup()
    const p = props()
    run.mockResolvedValue(pass)
    render(<CodeView item={code()} {...p} />)
    await user.click(screen.getByRole('button', { name: 'Подсказка 1 из 2' }))
    expect(screen.getByRole('list', { name: 'Подсказки' })).toHaveTextContent('Подсказка 1.Первая подсказка')
    expect(screen.queryByText('Вторая подсказка')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Подсказка 2 из 2' }))
    expect(screen.getByText('Вторая подсказка')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Подсказка \d/ })).toBeNull()

    await user.click(runButton())
    await user.click(await screen.findByRole('button', { name: /Дальше/ }))
    expect(p.onGrade).toHaveBeenCalledWith(2)
  })

  it('«Показать решение» — «Снова», даже если потом решить; эталон загружается один раз', async () => {
    const user = userEvent.setup()
    const p = props()
    run.mockResolvedValue(pass)
    render(<CodeView item={code()} {...p} />)
    await user.click(screen.getByRole('button', { name: 'Показать решение' }))
    expect(await screen.findByText('Решение открыто')).toBeInTheDocument()
    expect(screen.getByText('решение открыто — задача вернётся скоро')).toBeInTheDocument()
    expect(document.querySelector('details')).toHaveAttribute('open')

    await user.click(runButton())
    expect(await screen.findByText('Тесты: 1 из 1')).toBeInTheDocument()
    expect(screen.getByText('Решение открыто')).toBeInTheDocument()
    expect(reveal).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    expect(p.onGrade).toHaveBeenCalledWith(1)
  })

  it('после решения повторные запуски оценку не портят', async () => {
    const user = userEvent.setup()
    const p = props()
    run.mockResolvedValueOnce(pass).mockResolvedValueOnce(fail).mockResolvedValue(pass)
    render(<CodeView item={code()} {...p} />)
    await user.click(runButton())
    await screen.findByText('Решено')
    await user.click(runButton())
    await screen.findByText('Тесты: 1 из 2')
    await user.click(runButton())
    await screen.findByText('Тесты: 1 из 1')
    expect(reveal).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    expect(p.onGrade).toHaveBeenCalledWith(3)
  })

  it('пока идёт проверка, второй запуск не стартует', async () => {
    let finish!: (result: RunResult) => void
    run.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<CodeView item={code()} {...props()} />)
    fireEvent.click(runButton())
    expect(screen.getByRole('button', { name: /Проверяем…/ })).toBeDisabled()
    fireEvent.keyDown(editor(), { key: 'Enter', ctrlKey: true })
    expect(run).toHaveBeenCalledTimes(1)
    await act(async () => finish(fail))
    expect(runButton()).toBeEnabled()
  })

  it('остановка по времени и ошибка запуска показываются понятно', async () => {
    const user = userEvent.setup()
    run
      .mockResolvedValueOnce({ status: 'timeout', tests: [], logs: [], error: 'Код выполнялся дольше 5 с.' })
      .mockResolvedValueOnce({ status: 'error', tests: [], logs: ['перед ошибкой'], error: 'SyntaxError: x' })
    render(<CodeView item={code()} {...props()} />)
    await user.click(runButton())
    expect(await screen.findByText('Остановлено по времени. Код выполнялся дольше 5 с.')).toBeInTheDocument()
    await user.click(runButton())
    expect(await screen.findByText('Код не запустился. SyntaxError: x')).toBeInTheDocument()
    expect(screen.getByText('перед ошибкой')).toBeInTheDocument()
    expect(screen.queryByText(/Тесты:/)).toBeNull()
  })

  it('черновик восстанавливается, сброс возвращает заготовку и удаляет черновик', async () => {
    const user = userEvent.setup()
    localStorage.setItem('lic:draft:f/t#code', 'черновик')
    render(<CodeView item={code()} {...props()} />)
    expect(editor()).toHaveValue('черновик')
    await user.click(screen.getByRole('button', { name: 'Сбросить к заготовке' }))
    expect(editor()).toHaveValue('function sum() {}')
    expect(localStorage.getItem('lic:draft:f/t#code')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Сбросить к заготовке' })).toBeNull()
  })

  it('без доступа к хранилищу тренажёр работает, просто без черновика', async () => {
    const user = userEvent.setup()
    const p = props()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    run.mockResolvedValue(pass)
    render(<CodeView item={code()} {...p} />)
    await user.type(editor(), 'x')
    expect(editor()).toHaveValue('function sum() {}x')
    await user.click(runButton())
    await user.click(await screen.findByRole('button', { name: /Дальше/ }))
    expect(p.onGrade).toHaveBeenCalledWith(3)
  })

  it('эталон не загрузился — сообщение об ошибке, переход дальше возможен', async () => {
    const user = userEvent.setup()
    reveal.mockResolvedValueOnce({ error: 'Такой задачи нет' })
    run.mockResolvedValue(pass)
    render(<CodeView item={code()} {...props()} />)
    await user.click(runButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить решение: Такой задачи нет')
    expect(screen.queryByText('Эталонное решение')).toBeNull()
    expect(screen.getByRole('button', { name: /Дальше/ })).toBeInTheDocument()
  })

  it('нет связи с сервером при загрузке эталона', async () => {
    const user = userEvent.setup()
    reveal.mockRejectedValueOnce(new Error('offline'))
    render(<CodeView item={code()} {...props()} />)
    await user.click(screen.getByRole('button', { name: 'Показать решение' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Не удалось загрузить решение: нет связи с сервером')
  })

  it('в свободной тренировке у «Дальше» нет срока, задача без подсказок — без кнопки подсказки', async () => {
    const user = userEvent.setup()
    run.mockResolvedValue(pass)
    render(<CodeView item={code({ hints: [], level: 'boss' })} {...props(true)} />)
    expect(screen.getByText('Задача · Босс')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Подсказка/ })).toBeNull()
    await user.click(runButton())
    expect(await screen.findByRole('button', { name: /Дальше/ })).toHaveTextContent(/^Дальше$/)
  })

  it('задача на JavaScript: редактор в режиме JS', () => {
    render(<CodeView item={code()} {...props()} />)
    expect(editor()).toHaveAttribute('data-language', 'js')
  })
})

describe('задача на типы и React-задача', () => {
  it('типы: проверка компилятором в воркере, редактор TypeScript', async () => {
    const user = userEvent.setup()
    vi.mocked(checkTypesInWorker).mockResolvedValue(pass)
    render(<CodeView item={code({ kind: 'types', level: 'medium' })} {...props()} />)
    expect(screen.getByText('Задача на типы · Средняя')).toBeInTheDocument()
    expect(editor()).toHaveAttribute('data-language', 'ts')
    expect(screen.queryByRole('region', { name: 'Предпросмотр' })).toBeNull()
    await user.click(runButton())
    expect(checkTypesInWorker).toHaveBeenCalledWith('function sum() {}', "test('t', () => {})")
    expect(await screen.findByText('Решено')).toBeInTheDocument()
    expect(run).not.toHaveBeenCalled()
  })

  it('React: сборка в воркере, тесты в песочнице, предпросмотр', async () => {
    const user = userEvent.setup()
    vi.mocked(compileReactInWorker).mockResolvedValue({ code: 'собрано' })
    sandboxRun.mockResolvedValue(pass)
    sandboxFrame = null
    const { rerender } = render(<CodeView item={code({ kind: 'react', preview: '<Sum />' })} {...props()} />)
    expect(screen.getByText(/^React-задача · /)).toBeInTheDocument()
    expect(editor()).toHaveAttribute('data-language', 'tsx')
    expect(screen.getByRole('region', { name: 'Предпросмотр' })).toHaveTextContent('Предпросмотр появится после запуска тестов')

    await user.click(runButton())
    expect(compileReactInWorker).toHaveBeenCalledWith('function sum() {}', "test('t', () => {})", '<Sum />')
    expect(sandboxRun).toHaveBeenCalledWith('собрано')
    expect(await screen.findByText('Решено')).toBeInTheDocument()

    sandboxFrame = <div data-testid="frame" />
    rerender(<CodeView item={code({ kind: 'react', preview: '<Sum />' })} {...props()} />)
    expect(screen.getByTestId('frame')).toBeInTheDocument()
    expect(screen.getByText('Предпросмотр — с компонентом можно взаимодействовать')).toBeInTheDocument()
    sandboxFrame = null
  })

  it('React: ошибка сборки показывается, песочница не запускается', async () => {
    const user = userEvent.setup()
    sandboxRun.mockClear()
    vi.mocked(compileReactInWorker).mockResolvedValue({ error: 'Синтаксическая ошибка, строка 1: x' })
    render(<CodeView item={code({ kind: 'react' })} {...props()} />)
    await user.click(runButton())
    expect(await screen.findByText('Код не запустился. Синтаксическая ошибка, строка 1: x')).toBeInTheDocument()
    expect(sandboxRun).not.toHaveBeenCalled()
  })
})
