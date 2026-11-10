// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { usePathname, useRouter } from 'next/navigation'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { activeNav, NAV_ITEMS, searchEntries, type SearchEntry } from '@/widgets/app-shell/model/nav'
import { CommandPalette, OPEN_SEARCH_EVENT, SearchButton } from '@/widgets/app-shell/ui/CommandPalette'
import { NavLinks } from '@/widgets/app-shell/ui/NavLinks'

const ENTRIES: SearchEntry[] = [
  { title: 'Начать повторение', href: '/practice', context: 'Команда', kind: 'command' },
  { title: 'Сегодня', href: '/', context: 'Команда', kind: 'command' },
  { title: 'Замыкания', href: '/frontend/javascript/scope/closures', context: 'Frontend › JavaScript', kind: 'node' },
  { title: 'Ёлочные замыкания', href: '/x', context: 'Frontend', kind: 'node' },
  { title: 'Event loop', href: '/frontend/javascript/async/event-loop', context: 'Frontend › JavaScript › Асинхронность', kind: 'node' },
]

describe('навигация: модель', () => {
  it('разделы и активный раздел по адресу', () => {
    expect(NAV_ITEMS.map((item) => item.label)).toEqual(['Сегодня', 'Курс', 'Практика', 'Прогресс'])
    expect(activeNav('/')).toBe('today')
    expect(activeNav('/practice')).toBe('practice')
    expect(activeNav('/frontend/javascript')).toBe('course')
    expect(activeNav('/progress')).toBe('progress')
    expect(activeNav('/settings')).toBeNull()
    expect(activeNav('/sandbox')).toBeNull()
  })

  it('поиск: все слова, без учёта регистра и «ё», начало названия выше, лимит', () => {
    expect(searchEntries(ENTRIES, '').map((entry) => entry.title)).toEqual(['Начать повторение', 'Сегодня'])
    expect(searchEntries(ENTRIES, 'ЗАМЫК').map((entry) => entry.title)).toEqual(['Замыкания', 'Ёлочные замыкания'])
    expect(searchEntries(ENTRIES, 'елочные').map((entry) => entry.title)).toEqual(['Ёлочные замыкания'])
    // Слово из контекста: совпадение не в названии — ниже.
    expect(searchEntries(ENTRIES, 'асинхронность').map((entry) => entry.title)).toEqual(['Event loop'])
    expect(searchEntries(ENTRIES, 'javascript loop').map((entry) => entry.title)).toEqual(['Event loop'])
    expect(searchEntries(ENTRIES, 'нет такого')).toEqual([])
    expect(searchEntries(ENTRIES, 'а', 1)).toHaveLength(1)
  })
})

describe('пункты навигации', () => {
  beforeEach(() => vi.mocked(usePathname).mockReturnValue('/practice'))

  it('боковая панель: активный раздел и счётчик практики', () => {
    render(<NavLinks layout="side" practiceCount={24} />)
    const practice = screen.getByRole('link', { name: 'Практика, ждут 24' })
    expect(practice).toHaveAttribute('aria-current', 'page')
    expect(practice).toHaveAttribute('href', '/practice')
    expect(practice).toHaveClass('bg-surface')
    expect(screen.getByRole('link', { name: 'Сегодня' })).not.toHaveAttribute('aria-current')
    expect(screen.getByText('24')).toHaveAttribute('aria-hidden', 'true')
  })

  it('нижняя панель без счётчика', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    render(<NavLinks layout="bottom" practiceCount={0} />)
    expect(screen.getByRole('link', { name: 'Практика' })).not.toHaveAttribute('aria-label')
    expect(screen.getByRole('link', { name: 'Сегодня' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Сегодня' })).toHaveClass('h-16')
  })

  it('нижняя панель со счётчиком над иконкой', () => {
    render(<NavLinks layout="bottom" practiceCount={7} />)
    expect(screen.getByRole('link', { name: 'Практика, ждут 7' })).toBeInTheDocument()
    expect(screen.getByText('7')).toHaveClass('absolute')
  })
})

describe('поиск', () => {
  const push = vi.fn()
  beforeEach(() => {
    push.mockReset()
    vi.mocked(useRouter).mockReturnValue({ push } as never)
  })

  it('кнопки поиска открывают палитру', async () => {
    const user = userEvent.setup()
    render(
      <>
        <SearchButton />
        <SearchButton compact />
        <CommandPalette entries={ENTRIES} />
      </>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    const [full, compact] = screen.getAllByRole('button', { name: 'Поиск' })
    await user.click(full)
    expect(screen.getByRole('dialog', { name: 'Поиск' })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(compact)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('⌘K и Ctrl+K открывают и закрывают; без запроса — команды', () => {
    render(<CommandPalette entries={ENTRIES} />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['Начать повторениеКоманда', 'СегодняКоманда'])
    fireEvent.keyDown(window, { key: 'K', ctrlKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
    // Просто «k» без модификатора ничего не делает.
    fireEvent.keyDown(window, { key: 'k' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('стрелки выбирают по кругу, Enter открывает, выбранный пункт объявляется', async () => {
    const user = userEvent.setup()
    render(<CommandPalette entries={ENTRIES} />)
    act(() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)))
    const input = screen.getByRole('combobox')
    await user.type(input, 'замык')
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(2)
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id)
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowDown}')
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp}')
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(push).toHaveBeenCalledWith('/x')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('ничего не нашлось: стрелки и Enter ничего не делают', async () => {
    const user = userEvent.setup()
    render(<CommandPalette entries={ENTRIES} />)
    act(() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)))
    await user.type(screen.getByRole('combobox'), 'zzz')
    expect(screen.getByText('Ничего не нашлось. Попробуйте другое слово.')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).not.toHaveAttribute('aria-activedescendant')
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}')
    expect(push).not.toHaveBeenCalled()
  })

  it('мышь: наведение выбирает, клик открывает, клик по фону закрывает', async () => {
    const user = userEvent.setup()
    render(<CommandPalette entries={ENTRIES} />)
    act(() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)))
    const second = screen.getAllByRole('option')[1]
    await user.hover(second)
    expect(second).toHaveAttribute('aria-selected', 'true')
    await user.click(second)
    expect(push).toHaveBeenCalledWith('/')

    act(() => window.dispatchEvent(new Event(OPEN_SEARCH_EVENT)))
    fireEvent.mouseDown(screen.getByRole('dialog'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
