import { test as base, expect } from '@playwright/test'
import { resetDb, testDb } from './db'

/** Каждый тест начинает с чистой базы и падает, если в браузере была ошибка. */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      await resetDb()
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await use(errors)
      expect(errors, 'ошибки в консоли браузера').toEqual([])
    },
    { auto: true },
  ],
})

export { expect }

export async function reviewRows() {
  const db = testDb()
  const items = await db.reviewItem.findMany({ orderBy: { updatedAt: 'asc' } })
  const logs = await db.reviewLog.findMany({ orderBy: { reviewedAt: 'asc' } })
  await db.$disconnect()
  return { items, logs }
}

export async function progressRows() {
  const db = testDb()
  const rows = await db.nodeProgress.findMany()
  await db.$disconnect()
  return rows
}
