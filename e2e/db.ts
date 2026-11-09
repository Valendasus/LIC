import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

export const TEST_DATABASE_URL = 'postgres://lic:lic@localhost:5433/lic_test'

export function testDb() {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }) })
}

/** Чистая база перед каждым тестом: прогресс и повторения начинаются с нуля. */
export async function resetDb() {
  const db = testDb()
  await db.$executeRawUnsafe('TRUNCATE review_logs, review_items, node_progress, users RESTART IDENTITY CASCADE')
  await db.$disconnect()
}
