import { db } from '@/shared/api/db'

/** Чистая тестовая база перед каждым интеграционным тестом. */
export async function resetDb() {
  await db.$executeRawUnsafe('TRUNCATE review_logs, review_items, node_progress, users RESTART IDENTITY CASCADE')
}

export { db }
