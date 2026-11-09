import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.LIC_CONTENT_DIR = `${process.cwd()}/test/fixtures/content`
})

import { getLastTopic, getNextTopics, getTopicPractice, getTopicStatuses, getTopicSteps, getWeekActivity, startOfWeek, weekdayIndex } from '@/entities/review/api/today'
import { getTree, leavesOf } from '@/entities/topic/api/tree'
import { getCurrentUser } from '@/entities/user/api/user'
import { db, resetDb } from '../db'

const TOPIC = 'demo/block/mod/topic'
// Четверг, 12 ноября 2026, 15:00 по местному времени.
const NOW = new Date(2026, 10, 12, 15, 0, 0)

async function log(userId: string, itemId: string, rating: number, reviewedAt: Date) {
  await db.reviewLog.create({ data: { userId, itemId, rating, stateBefore: 0, reviewedAt } })
}

async function item(userId: string, itemId: string) {
  await db.reviewItem.create({
    data: { userId, itemId, kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', dueAt: new Date(Date.now() + 86_400_000), reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 },
  })
}

beforeEach(resetDb)

describe('неделя', () => {
  it('начало недели — понедельник, номер дня с понедельника', () => {
    expect(startOfWeek(NOW)).toEqual(new Date(2026, 10, 9))
    expect(startOfWeek(new Date(2026, 10, 15, 23))).toEqual(new Date(2026, 10, 9))
    expect(weekdayIndex(new Date(2026, 10, 9))).toBe(0)
    expect(weekdayIndex(new Date(2026, 10, 15))).toBe(6)
  })

  it('ответы по дням этой недели, доля «вспомнил», прошлое и будущее не считаются', async () => {
    const user = await getCurrentUser()
    await log(user.id, `${TOPIC}#a`, 3, new Date(2026, 10, 9, 10))
    await log(user.id, `${TOPIC}#a`, 1, new Date(2026, 10, 9, 11))
    await log(user.id, `${TOPIC}#b`, 4, new Date(2026, 10, 11, 9))
    await log(user.id, `${TOPIC}#b`, 4, new Date(2026, 10, 8, 9)) // прошлое воскресенье
    await log(user.id, `${TOPIC}#b`, 4, new Date(2026, 10, 12, 16)) // позже «сейчас»
    expect(await getWeekActivity(user.id, NOW)).toEqual({ days: [2, 0, 1, 0, 0, 0, 0], today: 3, activeDays: 2, answers: 3, accuracy: 2 / 3 })
  })

  it('без ответов доля не определена', async () => {
    const user = await getCurrentUser()
    expect((await getWeekActivity(user.id, NOW)).accuracy).toBeNull()
    expect((await getWeekActivity(user.id)).answers).toBe(0)
  })
})

describe('шаги темы', () => {
  it('ничего не начато', async () => {
    const user = await getCurrentUser()
    expect(await getTopicSteps(user.id, TOPIC)).toEqual({ learn: false, implement: { done: 0, total: 4 }, confirm: { done: 0, total: 5 } })
  })

  it('Learn по отметке освоения; задача «решена» оценкой не ниже «трудно»; карточки — начатые', async () => {
    const user = await getCurrentUser()
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: TOPIC, level: 1 } })
    await log(user.id, `${TOPIC}#quiz-one`, 1, NOW)
    await log(user.id, `${TOPIC}#out`, 2, NOW)
    await log(user.id, `${TOPIC}#out`, 3, NOW)
    await item(user.id, `${TOPIC}#term-a`)
    await item(user.id, `${TOPIC}#qa-b`)
    expect(await getTopicSteps(user.id, TOPIC)).toEqual({ learn: true, implement: { done: 1, total: 4 }, confirm: { done: 2, total: 5 } })
  })

  it('Learn засчитан и по ответам без отметки', async () => {
    const user = await getCurrentUser()
    await item(user.id, `${TOPIC}#term-a`)
    expect((await getTopicSteps(user.id, TOPIC)).learn).toBe(true)
  })
})

describe('последняя тема', () => {
  it('нет ни ответов, ни отметок', async () => {
    const user = await getCurrentUser()
    expect(await getLastTopic(user.id)).toBeNull()
  })

  it('берётся самое свежее: ответ или отметка', async () => {
    const user = await getCurrentUser()
    await log(user.id, `${TOPIC}#a`, 3, new Date(Date.now() - 60_000))
    expect(await getLastTopic(user.id)).toMatchObject({ node: { id: TOPIC, title: 'Тема' }, trail: ['Блок', 'Модуль'] })
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'demo/other/solo', level: 2 } })
    expect((await getLastTopic(user.id))!.node.id).toBe('demo/other/solo')
    // Отметка «не начато» не считается работой с темой.
    await db.nodeProgress.update({ where: { userId_nodeId: { userId: user.id, nodeId: 'demo/other/solo' } }, data: { level: 0 } })
    expect((await getLastTopic(user.id))!.node.id).toBe(TOPIC)
  })

  it('тема, которой больше нет в дереве, — пусто', async () => {
    const user = await getCurrentUser()
    await log(user.id, 'demo/gone/topic#a', 3, new Date())
    expect(await getLastTopic(user.id)).toBeNull()
    await db.reviewLog.deleteMany()
    await log(user.id, 'nope/x#a', 3, new Date())
    expect(await getLastTopic(user.id)).toBeNull()
  })
})

describe('дальше по пути', () => {
  it('темы с уроком или практикой в порядке курса, начатые и пропущенные исключаются', async () => {
    const user = await getCurrentUser()
    expect((await getNextTopics(user.id, 'demo')).map((ref) => ref.node.id)).toEqual([TOPIC, 'demo/other/solo'])
    expect((await getNextTopics(user.id, 'demo', { skip: TOPIC })).map((ref) => ref.node.id)).toEqual(['demo/other/solo'])
    expect(await getNextTopics(user.id, 'demo', { limit: 1 })).toHaveLength(1)
    await item(user.id, `${TOPIC}#term-a`)
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'demo/other/solo', level: 1 } })
    expect(await getNextTopics(user.id, 'demo')).toEqual([])
  })

  it('у неактивной специальности пусто', async () => {
    const user = await getCurrentUser()
    expect(await getNextTopics(user.id, 'later')).toEqual([])
  })
})

describe('практика и статусы тем', () => {
  it('задачи с редактором со статусом «решена», вопросы и карточки отдельно', async () => {
    const user = await getCurrentUser()
    expect(await getTopicPractice(user.id, TOPIC)).toEqual({ tasks: [], questions: 4, cards: 5 })
    await log(user.id, 'demo/other/solo#sum', 1, NOW)
    await log(user.id, 'demo/other/solo#bare', 2, NOW)
    const practice = await getTopicPractice(user.id, 'demo/other/solo')
    expect(practice.tasks).toEqual([
      { id: 'demo/other/solo#sum', title: 'Сумма', level: 'easy', kind: 'code', solved: false },
      { id: 'demo/other/solo#bare', title: 'Ноль', level: 'warmup', kind: 'code', solved: true },
      { id: 'demo/other/solo#view', title: 'Привет', level: 'easy', kind: 'react', solved: false },
    ])
    expect(practice).toMatchObject({ questions: 0, cards: 0 })
  })

  it('освоена, начата, можно начинать, готовится', async () => {
    const user = await getCurrentUser()
    const tree = (await getTree('demo'))!
    const leaves = leavesOf(tree)
    expect([...(await getTopicStatuses(user.id, 'demo', leaves)).values()]).toEqual(['new', 'soon', 'new'])
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: TOPIC, level: 2 } })
    await item(user.id, 'demo/other/solo#sum')
    await db.nodeProgress.create({ data: { userId: user.id, nodeId: 'demo/block/mod/empty', level: 1 } })
    expect(Object.fromEntries(await getTopicStatuses(user.id, 'demo', leaves))).toEqual({ [TOPIC]: 'mastered', 'demo/block/mod/empty': 'started', 'demo/other/solo': 'started' })
  })
})
