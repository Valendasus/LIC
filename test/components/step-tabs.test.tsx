// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StepTabs, type Step } from '@/shared/ui'

const steps: Step[] = [
  { id: 'learn', title: 'Learn', hint: 'понять', status: 'Пройдено', state: 'done', progress: 1, content: <p>Объяснение</p>, toc: [{ id: 'a', title: 'А' }, { id: 'b', title: 'Б' }] },
  { id: 'implement', title: 'Implement', hint: 'применить', status: 'Решено 2 из 4', state: 'progress', progress: 0.5, content: <p>Задачи</p>, toc: [{ id: 'c', title: 'В' }] },
  { id: 'confirm', title: 'Confirm', hint: 'закрепить', status: '19 карточек', state: 'todo', progress: 0, content: <p>Карточки</p> },
]

afterEach(() => window.history.replaceState(null, '', '/'))

describe('шаги-вкладки', () => {
  it('первый шаг по умолчанию; статусы словами; оглавление, если в нём больше одного раздела', () => {
    render(<StepTabs label="Шаги темы" steps={steps} finalAction={<a href="/next">Следующая тема</a>} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveTextContent('Learn · понятьПройдено')
    expect(tabs[1]).toHaveTextContent('Решено 2 из 4')
    expect(tabs[1]).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Объяснение')
    expect(screen.getByRole('navigation', { name: 'На странице' })).toHaveTextContent('АБ')
    expect(screen.getByRole('link', { name: 'А' })).toHaveAttribute('href', '#a')
    expect(screen.queryByRole('link', { name: 'Следующая тема' })).toBeNull()
  })

  it('шаг из адреса; клик и «Дальше» меняют шаг и адрес; на последнем — итоговое действие', async () => {
    window.history.replaceState(null, '', '/#implement')
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<StepTabs label="Шаги темы" steps={steps} finalAction={<a href="/next">Следующая тема</a>} />)
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Implement')
    // У шага с одним разделом оглавление не нужно.
    expect(screen.queryByRole('navigation', { name: 'На странице' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Дальше: Confirm' }))
    expect(window.location.hash).toBe('#confirm')
    expect(screen.getByRole('tab', { name: /Confirm/ })).toHaveFocus()
    expect(scroll).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Следующая тема' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Learn/ }))
    expect(window.location.hash).toBe('#learn')
  })

  it('неизвестный шаг в адресе — первый шаг', () => {
    window.history.replaceState(null, '', '/#что-то')
    render(<StepTabs label="Шаги" steps={steps} />)
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Learn')
  })

  it('стрелки по кругу, Home и End; другие клавиши не мешают', () => {
    render(<StepTabs label="Шаги" steps={steps} />)
    const list = screen.getByRole('tablist')
    fireEvent.keyDown(list, { key: 'ArrowLeft' })
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Confirm')
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Learn')
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Implement')
    fireEvent.keyDown(list, { key: 'End' })
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Confirm')
    fireEvent.keyDown(list, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Learn')
    fireEvent.keyDown(list, { key: 'Home' })
    fireEvent.keyDown(list, { key: 'a' })
    expect(screen.getByRole('tab', { selected: true })).toHaveTextContent('Learn')
  })
})
