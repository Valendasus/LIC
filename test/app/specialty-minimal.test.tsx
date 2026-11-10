import { describe, expect, it, vi } from 'vitest'

// Специальность без описания, без файла этапов и без тем, с которых можно начать: дерево подменено.
vi.mock('@/entities/topic/api/tree', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/entities/topic/api/tree')>()
  const block = { id: 'x/a', slug: 'a', title: 'Пустой блок', path: ['a'], children: [] }
  return {
    ...original,
    getTree: vi.fn(async () => ({ id: 'x', slug: 'x', title: 'X', path: [], children: [block] })),
    getStages: vi.fn(async () => [{ title: 'X', summary: '', blocks: [block] }]),
  }
})

import SpecialtyPage from '@/app/(site)/[specialty]/page'
import { resetDb } from '../db'
import { rendered } from '../tree'

describe('минимальная специальность', () => {
  it('без описания и без темы для начала — без кнопки; этап без описания', async () => {
    await resetDb()
    const { text, html } = rendered(await SpecialtyPage({ params: Promise.resolve({ specialty: 'x' }) }))
    expect(text).toContain('Пустой блок')
    expect(text).not.toContain('Начать')
    expect(html).not.toContain('mt-0.5 text-sm text-muted')
  })
})
