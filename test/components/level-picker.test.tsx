// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/app/(site)/actions', () => ({ setLevel: vi.fn() }))

import { setLevel } from '@/app/(site)/actions'
import { LevelPicker } from '@/components/LevelPicker'

const mocked = vi.mocked(setLevel)
beforeEach(() => mocked.mockReset())

describe('отметка освоения', () => {
  it('отправляет выбранный уровень и подсвечивает его', async () => {
    mocked.mockResolvedValue({ level: 3 })
    const user = userEvent.setup()
    render(<LevelPicker nodeId="f/a" level={0} />)
    await user.click(screen.getByRole('button', { name: /^Применяю/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^Применяю/ })).toHaveAttribute('aria-pressed', 'true'))
    const data = mocked.mock.calls[0][1] as FormData
    expect(Object.fromEntries(data)).toEqual({ nodeId: 'f/a', level: '3' })
  })

  it('повторное нажатие на текущий уровень отправляет 0 — сброс', async () => {
    mocked.mockResolvedValue({ level: 0 })
    const user = userEvent.setup()
    render(<LevelPicker nodeId="f/a" level={2} />)
    expect(screen.getByRole('button', { name: /^Понимаю/ })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: /^Понимаю/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /^Понимаю/ })).toHaveAttribute('aria-pressed', 'false'))
    expect((mocked.mock.calls[0][1] as FormData).get('level')).toBe('0')
  })

  it('ошибка сервера показывается, уровень остаётся прежним', async () => {
    mocked.mockResolvedValue({ error: 'Такой темы нет' })
    const user = userEvent.setup()
    render(<LevelPicker nodeId="f/a" level={1} />)
    await user.click(screen.getByRole('button', { name: /^Владею/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Такой темы нет')
    expect(screen.getByRole('button', { name: /^Знаю/ })).toHaveAttribute('aria-pressed', 'true')
  })
})
