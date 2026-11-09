import { describe, expect, it, vi } from 'vitest'

// Блок без группы попадает в «Другое». В реальном контенте у всех блоков группа есть, поэтому дерево подменено.
vi.mock('@/entities/topic/api/tree', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/entities/topic/api/tree')>()
  return {
    ...original,
    getTree: vi.fn(async () => ({
      id: 'x',
      slug: 'x',
      title: 'X',
      path: [],
      children: [{ id: 'x/a', slug: 'a', title: 'Без группы', path: ['a'], children: [] }],
    })),
  }
})

import SpecialtyPage from '@/app/(site)/[specialty]/page'
import { resetDb } from '../db'
import { textOf } from '../tree'

describe('группы блоков', () => {
  it('блок без группы попадает в «Другое»', async () => {
    await resetDb()
    const page = await SpecialtyPage({ params: Promise.resolve({ specialty: 'x' }) })
    expect(textOf(page)).toContain('Другое')
  })
})
