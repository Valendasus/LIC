// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(site)/review/actions', () => ({ reviewItem: vi.fn(), revealSolution: vi.fn() }))
vi.mock('@/components/practice/code/CodeEditor', () => ({ CodeEditor: ({ label }: { label: string }) => <textarea aria-label={label} /> }))

import { reviewItem, type ReviewResult } from '@/app/(site)/review/actions'
import { PracticeSession } from '@/components/practice/PracticeSession'
import { card, code, entry, intervals, order, output, quiz } from './fixtures'

const mocked = vi.mocked(reviewItem)
beforeEach(() => mocked.mockReset())

const counter = () => document.querySelector('.font-mono')!.textContent
const flipAndRate = (key: string) => {
  fireEvent.keyDown(document.body, { key: ' ' })
  fireEvent.keyDown(document.body, { key })
}

describe('сессия практики', () => {
  it('оценка уходит на сервер; элемент, который скоро вернётся, повторяется в этой же сессии', async () => {
    let resolveFirst!: (value: ReviewResult) => void
    mocked.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve))).mockResolvedValue({ dueAt: 'x' })
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2', front: 'Второй' }), 'review')]} orders={{}} mode="review" backHref="/f/t" />)
    expect(counter()).toBe('1 / 2')
    expect(screen.getByText('Новое')).toBeInTheDocument()

    flipAndRate('1')
    expect(mocked).toHaveBeenCalledWith('f/t#card', 1, expect.any(Number))
    expect(counter()).toBe('2 / 2')
    expect(screen.getByText('Повторение')).toBeInTheDocument()
    await act(async () => resolveFirst({ dueAt: 'x', intervals: { ...intervals, 1: '10 мин' } }))
    expect(counter()).toBe('2 / 3')

    flipAndRate('3')
    // Вернувшаяся карточка показывается со статусом «Изучение» и новыми интервалами.
    await screen.findByText('Изучение')
    flipAndRate('3')
    expect(await screen.findByText('Сессия завершена')).toBeInTheDocument()
    expect(screen.getByText(/Ответов: 3 · с первого раза или верно: 2/)).toBeInTheDocument()
    expect(screen.getByText('Карточки: 3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Вернуться' })).toHaveAttribute('href', '/f/t')
  })

  it('пока ответы сохраняются, итог не показывается, а уход со страницы требует подтверждения', async () => {
    let resolve!: (value: ReviewResult) => void
    mocked.mockReturnValue(new Promise((r) => (resolve = r)))
    render(<PracticeSession items={[entry(card())]} orders={{}} mode="review" backHref="/" />)
    flipAndRate('3')
    expect(screen.getByRole('status')).toHaveTextContent('Сохраняем ответы…')
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)

    await act(async () => resolve({ dueAt: 'x' }))
    expect(screen.getByText('Сессия завершена')).toBeInTheDocument()
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
  })

  it('ошибка сервера и обрыв связи показываются пользователю', async () => {
    mocked.mockResolvedValueOnce({ error: 'Такого элемента нет' }).mockRejectedValueOnce(new Error('сеть'))
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2' }))]} orders={{}} mode="review" backHref="/" />)
    flipAndRate('3')
    expect(await screen.findByRole('alert')).toHaveTextContent('Ответ не сохранился: Такого элемента нет')
    flipAndRate('3')
    // Ошибка на последнем элементе видна и на экране итогов.
    await screen.findByText('Сессия завершена')
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('нет связи с сервером'))
  })

  it('свободный режим: ничего не сохраняется, ошибка возвращает элемент в конец', async () => {
    render(<PracticeSession items={[entry(card())]} orders={{}} mode="free" backHref="/" />)
    expect(screen.getByText('без расписания')).toBeInTheDocument()
    flipAndRate('1')
    expect(counter()).toBe('2 / 2')
    flipAndRate('2')
    expect(await screen.findByText('Сессия завершена')).toBeInTheDocument()
    expect(mocked).not.toHaveBeenCalled()
  })

  it('в одной очереди все виды заданий; правильный порядок берётся из orders', async () => {
    mocked.mockResolvedValue({ dueAt: 'x' })
    const user = userEvent.setup()
    const items = [entry(quiz()), entry(output({ answer: ['a'] })), entry(order()), entry(order({ id: 'f/t#unknown-order' }))]
    render(<PracticeSession items={items} orders={{ 'f/t#ord': ['Один', 'Два', 'Три'] }} mode="review" backHref="/" />)
    expect(screen.getByRole('link', { name: 'Тема: Тема' })).toHaveAttribute('href', '/f/t')

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

    await screen.findByText('Сессия завершена')
    expect(mocked.mock.calls.map((call) => call[1])).toEqual([3, 2, 3, 1])
    expect(screen.getByText('Квизы: 1 · Что выведет: 1 · Порядок: 2')).toBeInTheDocument()
  })

  it('задача на код показывается в сессии', () => {
    render(<PracticeSession items={[entry(code())]} orders={{}} mode="review" backHref="/" />)
    expect(screen.getByText('Задача · Лёгкая')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Решение задачи «Сумма»' })).toBeInTheDocument()
  })

  it('второе нажатие до перерисовки не оценивает элемент повторно и не пропускает следующий', () => {
    mocked.mockResolvedValue({ dueAt: 'x' })
    render(<PracticeSession items={[entry(card()), entry(card({ id: 'f/t#c2', front: 'Второй' }))]} orders={{}} mode="review" backHref="/" />)
    fireEvent.keyDown(document.body, { key: ' ' })
    const good = screen.getByRole('button', { name: /Хорошо/ })
    // Два клика в одном обработчике: React ещё не перерисовал экран между ними.
    act(() => {
      good.click()
      good.click()
    })
    expect(mocked).toHaveBeenCalledTimes(1)
    expect(counter()).toBe('2 / 2')
    expect(screen.getByText('Второй')).toBeInTheDocument()
  })
})
