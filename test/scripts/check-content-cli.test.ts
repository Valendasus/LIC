import { afterEach, describe, expect, it, vi } from 'vitest'

const checkContent = vi.fn()
vi.mock('../../scripts/content-check.mjs', () => ({ checkContent }))

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetModules()
  process.exitCode = undefined
})

describe('npm run content:check', () => {
  it('без ошибок печатает статистику', async () => {
    checkContent.mockResolvedValue({ errors: [], stats: { leaves: 3, filled: 1, cards: 2, practice: 4 } })
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    await import('../../scripts/check-content.mjs')
    expect(log).toHaveBeenCalledWith('✓ Контент в порядке: тем 3, наполнено 1, карточек 2, заданий 4')
    expect(process.exitCode).toBeUndefined()
  })

  it('с ошибками печатает их и завершается с кодом 1', async () => {
    checkContent.mockResolvedValue({ errors: ['a', 'b'], stats: {} })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await import('../../scripts/check-content.mjs')
    expect(error).toHaveBeenCalledWith('✗ a\n✗ b')
    expect(process.exitCode).toBe(1)
  })
})
