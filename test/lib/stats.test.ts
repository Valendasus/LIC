import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.LIC_CONTENT_DIR = `${process.cwd()}/test/fixtures/content`
})

import { getActivity, getMemory, getTaskStats, getWeakTopics } from '@/entities/review/api/stats'
import { getCurrentUser } from '@/entities/user/api/user'
import { db, resetDb } from '../db'

const NOW = new Date(2026, 10, 12, 15)
const at = (days: number, hour = 10) => new Date(2026, 10, 12 + days, hour)
const log = (userId: string, itemId: string, rating: number, reviewedAt: Date) => db.reviewLog.create({ data: { userId, itemId, rating, stateBefore: 0, reviewedAt } })
const item = (userId: string, itemId: string, state: number, dueAt: Date) =>
  db.reviewItem.create({ data: { userId, itemId, kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state, scheduleStatus: 'review', dueAt, reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 } })

beforeEach(resetDb)

describe('статистика', () => {
  it('активность по дням: окно заданной длины, сегодня последним', async () => {
    const user = await getCurrentUser()
    await log(user.id, 'demo/block/mod/topic#a', 3, at(0, 9))
    await log(user.id, 'demo/block/mod/topic#a', 1, at(0, 11))
    await log(user.id, 'demo/block/mod/topic#a', 3, at(-2))
    await log(user.id, 'demo/block/mod/topic#a', 3, at(-10)) // за пределами окна
    const days = await getActivity(user.id, 7, NOW)
    expect(days.map((day) => day.date)).toEqual(['2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'])
    expect(days.map((day) => day.answers)).toEqual([0, 0, 0, 0, 1, 0, 2])
    expect(await getActivity(user.id)).toHaveLength(182)
  })

  it('память: выучено, в изучении, повторения по дням недели вперёд (просроченные — сегодня)', async () => {
    const user = await getCurrentUser()
    await item(user.id, 'a', 2, at(-3))
    await item(user.id, 'b', 2, at(0, 20))
    await item(user.id, 'c', 1, at(1))
    await item(user.id, 'd', 3, at(6))
    await item(user.id, 'e', 2, at(9))
    expect(await getMemory(user.id, NOW)).toEqual({ learned: 3, learning: 2, forecast: [2, 1, 0, 0, 0, 0, 1] })
    expect((await getMemory(user.id)).forecast).toHaveLength(7)
  })

  it('слабые места: «не вспомнил» за 30 дней по темам, по убыванию; исчезнувшие темы пропускаются', async () => {
    const user = await getCurrentUser()
    await log(user.id, 'demo/other/solo#sum', 1, at(-1))
    await log(user.id, 'demo/block/mod/topic#a', 1, at(-1))
    await log(user.id, 'demo/block/mod/topic#b', 1, at(-2))
    await log(user.id, 'demo/block/mod/topic#c', 3, at(-2))
    await log(user.id, 'demo/block/mod/topic#c', 1, at(-40))
    await log(user.id, 'demo/gone/x#a', 1, at(-1))
    await log(user.id, 'nope/x#a', 1, at(-1))
    const weak = await getWeakTopics(user.id, 5, NOW)
    expect(weak.map((topic) => [topic.node.id, topic.misses])).toEqual([
      ['demo/block/mod/topic', 2],
      ['demo/other/solo', 1],
    ])
    expect(await getWeakTopics(user.id, 1, NOW)).toHaveLength(1)
    expect(await getWeakTopics(user.id)).toHaveLength(2)
  })

  it('задачи по уровням: всего, решено, с первого запуска', async () => {
    const user = await getCurrentUser()
    await log(user.id, 'demo/other/solo#sum', 1, at(-2))
    await log(user.id, 'demo/other/solo#sum', 3, at(-1))
    await log(user.id, 'demo/other/solo#view', 4, at(-1))
    expect(await getTaskStats(user.id, 'demo')).toEqual([
      { level: 'warmup', total: 1, solved: 0, firstTry: 0 },
      { level: 'easy', total: 2, solved: 2, firstTry: 1 },
    ])
  })
})
