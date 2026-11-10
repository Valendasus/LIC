// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/settings/api/actions', () => ({ setPace: vi.fn(async (_state: unknown, form: FormData) => ({ value: Number(form.get('value')) })) }))

import { setPace } from '@/features/settings/api/actions'
import { MOTION_KEY, PACE_OPTIONS } from '@/features/settings/model/pace'
import { MotionPreference, MotionToggle } from '@/features/settings/ui/Motion'
import { PaceForm } from '@/features/settings/ui/PaceForm'

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.motion
  vi.restoreAllMocks()
})

describe('темп', () => {
  it('четыре варианта, текущий отмечен; выбор уходит на сервер и отмечается', async () => {
    const user = userEvent.setup()
    expect(PACE_OPTIONS.map((option) => option.value)).toEqual([10, 20, 30, 50])
    render(<PaceForm value={20} />)
    expect(screen.getByRole('button', { name: /Обычно/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /Перед собесом/ }))
    expect(setPace).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: /Перед собесом/, pressed: true })).toBeInTheDocument()
  })

  it('ошибка сервера показывается', async () => {
    vi.mocked(setPace).mockResolvedValueOnce({ error: 'Такого темпа нет' })
    const user = userEvent.setup()
    render(<PaceForm value={20} />)
    await user.click(screen.getByRole('button', { name: /Спокойно/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Такого темпа нет')
    expect(screen.getByRole('button', { name: /Обычно/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('анимации', () => {
  it('переключатель сохраняет выбор и включает режим на странице', async () => {
    const user = userEvent.setup()
    render(<MotionToggle />)
    const toggle = screen.getByRole('switch', { name: /Уменьшить анимации/ })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(localStorage.getItem(MOTION_KEY)).toBe('1')
    expect(document.documentElement.dataset.motion).toBe('reduce')
    await user.click(toggle)
    expect(localStorage.getItem(MOTION_KEY)).toBeNull()
    expect(document.documentElement.dataset.motion).toBeUndefined()
  })

  it('сохранённый выбор применяется при загрузке любой страницы', () => {
    localStorage.setItem(MOTION_KEY, '1')
    render(<MotionPreference />)
    expect(document.documentElement.dataset.motion).toBe('reduce')
    render(<MotionToggle />)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true')
  })

  it('без хранилища работает до перезагрузки', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const user = userEvent.setup()
    render(
      <>
        <MotionPreference />
        <MotionToggle />
      </>,
    )
    await user.click(screen.getByRole('switch'))
    expect(document.documentElement.dataset.motion).toBe('reduce')
  })
})
