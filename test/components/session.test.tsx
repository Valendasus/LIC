// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/grade-item/api/actions', () => ({ reviewItem: vi.fn() }))
vi.mock('@/features/solve-task/api/actions', () => ({ revealSolution: vi.fn() }))
vi.mock('@/features/solve-task/ui/CodeEditor', () => ({ CodeEditor: ({ label }: { label: string }) => <textarea aria-label={label} /> }))

import { reviewItem, type ReviewResult } from '@/features/grade-item/api/actions'
import { useRouter } from 'next/navigation'
import { PracticeSession, returnsSummary } from '@/widgets/practice-session/ui/PracticeSession'
import { card, code, entry, intervals, order, output, quiz } from './fixtures'

const mocked = vi.mocked(reviewItem)
beforeEach(() => mocked.mockReset())

const counter = () => document.querySelector('[data-counter]')!.textContent
const flipAndRate = (key: string) => {
  fireEvent.keyDown(document.body, { key: ' ' })
  fireEvent.keyDown(document.body, { key })
}

describe('сессия практики', () => {
  it('оценка уходит на сервер; элемент, который скоро вернётся, повторяется в этой же сессии', async () => {
    let resolveFirst!: (value: ReviewResult) => void
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString()
    mocked.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve))).mockResolvedValue({ dueAt: tomorrow })
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2', front: 'Второй' }), 'review')]} orders={{}} mode="review" backHref="/f/t" title="Тема" />)
    expect(counter()).toBe('1 / 2')
    expect(screen.getByText('Новое')).toBeInTheDocument()

    flipAndRate('1')
    expect(mocked).toHaveBeenCalledWith('f/t#card', 1, expect.any(Number))
    expect(counter()).toBe('2 / 2')
    expect(screen.getByText('Повторение')).toBeInTheDocument()
    await act(async () => resolveFirst({ dueAt: new Date().toISOString(), intervals: { ...intervals, 1: 'через 10 минут' } }))
    expect(counter()).toBe('2 / 3')

    flipAndRate('3')
    // Вернувшаяся карточка показывается со статусом «Изучение» и новыми интервалами.
    await screen.findByText('Изучение')
    flipAndRate('3')
    expect(await screen.findByRole('heading', { name: 'Готово · 3 ответа' })).toBeInTheDocument()
    expect(screen.getByText('2 из 3 · 67 %')).toBeInTheDocument()
    expect(screen.getByText('Карточки: 3')).toBeInTheDocument()
    expect(screen.getByText('Что вернётся: сегодня 1 · завтра 2')).toBeInTheDocument()
    expect(screen.getByText('Сложнее всего:', { exact: false }).parentElement).toHaveTextContent('Сложнее всего: Тема — 1 ошибка')
    expect(screen.getByRole('link', { name: /Вернуться к теме/ })).toHaveAttribute('href', '/f/t')
    expect(screen.getByRole('link', { name: 'На «Сегодня»' })).toHaveAttribute('href', '/')
  })

  it('пока ответы сохраняются, итог не показывается, а уход со страницы требует подтверждения', async () => {
    let resolve!: (value: ReviewResult) => void
    mocked.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<PracticeSession items={[entry(card())]} orders={{}} mode="review" backHref="/" title="Повторение" />)
    flipAndRate('3')
    expect(screen.getByRole('status')).toHaveTextContent('Сохраняем ответы…')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)

    await act(async () => resolve({ dueAt: new Date().toISOString() }))
    expect(screen.getByRole('heading', { name: /^Готово/ })).toBeInTheDocument()
    // В итоге с «Сегодня» одна кнопка — туда же.
    expect(screen.getAllByRole('link', { name: /На «Сегодня»/ })).toHaveLength(1)
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })

  it('ошибка сервера и обрыв связи показываются пользователю', async () => {
    mocked.mockResolvedValueOnce({ error: 'Такого элемента нет' }).mockRejectedValueOnce(new Error('сеть'))
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2' }))]} orders={{}} mode="review" backHref="/" title="Повторение" />)
    flipAndRate('3')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ответ не сохранился: Такого элемента нет')
    flipAndRate('3')
    // Ошибка на последнем элементе видна и на экране итогов.
    await screen.findByRole('heading', { name: /^Готово/ })
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('нет связи с сервером'))
  })

  it('свободный режим: ничего не сохраняется, ошибка возвращает элемент в конец', async () => {
    render(<PracticeSession items={[entry(card())]} orders={{}} mode="free" backHref="/" title="Свободная" />)
    expect(screen.getByText('без расписания')).toBeInTheDocument()
    flipAndRate('1')
    expect(counter()).toBe('2 / 2')
    flipAndRate('2')
    expect(await screen.findByRole('heading', { name: 'Готово · 2 ответа' })).toBeInTheDocument()
    expect(screen.queryByText(/Что вернётся/)).toBeNull()
    expect(mocked).not.toHaveBeenCalled()
  })

  it('в одной очереди все виды заданий; правильный порядок берётся из orders', async () => {
    mocked.mockResolvedValue({ dueAt: 'не дата' })
    const user = userEvent.setup()
    const items = [entry(quiz()), entry(output({ answer: ['a'] })), entry(order()), entry(order({ id: 'f/t#unknown-order' }))]
    render(<PracticeSession items={items} orders={{ 'f/t#ord': ['Один', 'Два', 'Три'] }} mode="review" backHref="/" title="Повторение" />)
    expect(screen.getByRole('link', { name: /^Тема: Тема/ })).toHaveAttribute('href', '/f/t')
    expect(screen.getByRole('link', { name: /^Тема: Тема/ })).toHaveAttribute('target', '_blank')

    await user.click(screen.getByRole('radio', { name: /Верный/ }))
    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    await user.type(screen.getByLabelText(/Вывод в консоли/), 'a')
    await user.click(screen.getByRole('button', { name: /Проверить/ }))
    await user.click(screen.getByRole('button', { name: /Угадал/ }))
    for (const step of ['Один', 'Два', 'Три']) await user.click(screen.getByRole('button', { name: step }))
    expect(screen.getByRole('status')).toHaveTextContent('Верно')
    await user.click(screen.getByRole('button', { name: /Дальше/ }))
    // Для задания без записи в orders правильного порядка нет — любой ответ неверный.
    for (const step of ['Один', 'Два', 'Три']) await user.click(screen.getByRole('button', { name: step }))
    expect(screen.getByRole('status')).toHaveTextContent('Неверно')
    await user.click(screen.getByRole('button', { name: /Дальше/ }))

    await screen.findByRole('heading', { name: /^Готово/ })
    expect(mocked.mock.calls.map((call) => call[1])).toEqual([3, 2, 3, 1])
    expect(screen.getByText('Квизы: 1 · Что выведет: 1 · Порядок: 2')).toBeInTheDocument()
  })

  it('задача на код показывается в сессии', () => {
    render(<PracticeSession items={[entry(code())]} orders={{}} mode="review" backHref="/" title="Повторение" />)
    expect(screen.getByText('Задача · Лёгкая')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Решение задачи «Сумма»' })).toBeInTheDocument()
  })

  it('второе нажатие до перерисовки не оценивает элемент повторно и не пропускает следующий', () => {
    mocked.mockResolvedValue({ dueAt: 'не дата' })
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2', front: 'Второй' }))]} orders={{}} mode="review" backHref="/" title="Повторение" />)
    fireEvent.keyDown(document.body, { key: ' ' })
    const good = screen.getByRole('button', { name: /^Вспомнил/ })
    // Два клика в одном обработчике: React ещё не перерисовал экран между ними.
    act(() => {
      good.click()
      good.click()
    })
    expect(mocked).toHaveBeenCalledTimes(1)
    expect(counter()).toBe('2 / 2')
    expect(screen.getByText('Второй')).toBeInTheDocument()
  })

  it('полоса фокуса: заголовок, выход, результаты отрезками', () => {
    mocked.mockResolvedValue({ dueAt: 'не дата' })
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2' })), entry(card({ id: 'f/t#c3' }))]} orders={{}} mode="review" backHref="/f/t" title="Замыкания · карточки" />)
    expect(screen.getByText('Замыкания · карточки')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Выйти из сессии' })).toHaveAttribute('href', '/f/t')
    flipAndRate('1')
    flipAndRate('2')
    const bar = screen.getByRole('progressbar', { name: 'Прогресс сессии' })
    expect([...bar.children].map((segment) => segment.className.match(/bg-(bad|warn|good|fg|surface)\b/)![0])).toEqual(['bg-bad', 'bg-warn', 'bg-fg'])
  })

  it('Esc выходит из сессии, но не из редактора и не пока сохраняются ответы', async () => {
    const push = vi.fn()
    vi.mocked(useRouter).mockReturnValue({ push } as never)
    let resolve!: (value: ReviewResult) => void
    mocked.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2' }))]} orders={{}} mode="review" backHref="/f/t" title="Т" />)
    const editor = document.createElement('div')
    editor.className = 'cm-editor'
    document.body.append(editor)
    fireEvent.keyDown(editor, { key: 'Escape' })
    editor.remove()
    fireEvent.keyDown(document.body, { key: 'a' })
    expect(push).not.toHaveBeenCalled()
    flipAndRate('3')
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(push).not.toHaveBeenCalled()
    await act(async () => resolve({ dueAt: 'не дата' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(push).toHaveBeenCalledWith('/f/t')
  })

  it('когда что вернётся: сегодня, завтра, на неделе, позже', () => {
    const now = new Date(2026, 10, 12, 15)
    const at = (days: number, hour = 10) => new Date(2026, 10, 12 + days, hour).toISOString()
    expect(returnsSummary([at(0, 9), at(0, 23), at(1), at(2), at(7), at(8), at(30)], now)).toEqual([
      { label: 'сегодня', count: 2 },
      { label: 'завтра', count: 1 },
      { label: 'на неделе', count: 2 },
      { label: 'позже', count: 2 },
    ])
    expect(returnsSummary([], now)).toEqual([])
    expect(returnsSummary([at(1)])).toHaveLength(1)
  })

  it('«Сложнее всего» — тема с наибольшим числом ошибок', async () => {
    mocked.mockResolvedValue({ dueAt: 'не дата' })
    const other = { topicId: 'f/u', topicTitle: 'Другая', topicHref: '/f/u' }
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/u#1', ...other })), entry(card({ id: 'f/u#2', ...other }))]} orders={{}} mode="review" backHref="/" title="Т" />)
    flipAndRate('1')
    flipAndRate('1')
    flipAndRate('1')
    await screen.findByRole('heading', { name: /^Готово/ })
    expect(screen.getByText('Сложнее всего:', { exact: false }).parentElement).toHaveTextContent('Сложнее всего: Другая — 2 ошибки')
  })
})
