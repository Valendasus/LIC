import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('каталог контента по умолчанию', () => {
  it('без LIC_CONTENT_DIR читается content/ проекта', async () => {
    delete process.env.LIC_CONTENT_DIR
    const tree = await import('@/entities/topic/api/tree')
    const items = await import('@/entities/practice-item/api/items')
    expect((await tree.getSpecialties()).some((item) => item.slug === 'frontend')).toBe(true)
    expect((await items.getItems('frontend')).length).toBeGreaterThan(0)
    expect(process.cwd()).toBe(path.resolve(import.meta.dirname, '../..'))
  })
})
