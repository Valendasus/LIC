import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.LIC_CONTENT_DIR = `${process.cwd()}/test/fixtures/content`
})

import { getCurrentUser } from '@/entities/user/api/user'
import { buildSession, getReviewCounts, LEARN_AHEAD_MINUTES, NEW_PER_DAY, SESSION_LIMIT } from '@/entities/review/api/session'
import type { CodeItem, OrderItem } from '@/entities/practice-item/api/items'
import { db, resetDb } from '../db'

const TOPIC = 'demo/block/mod/topic'
const id = (key: string) => `${TOPIC}#${key}`

async function studied(userId: string, key: string, dueAt: Date, state = 2, createdAt = new Date()) {
  await db.reviewItem.create({
    data: {
      userId,
      itemId: id(key),
      kind: 'card',
      stability: 1,
      stabilityFast: 1,
      difficulty: 5,
      state,
      scheduleStatus: state === 2 ? 'review' : 'learning',
      dueAt,
      lastReviewAt: new Date(),
      reps: 1,
      lapses: 0,
      scheduledDays: 1,
      learningStep: 0,
      createdAt,
    },
  })
}

beforeEach(resetDb)
afterEach(() => vi.restoreAllMocks())

describe('сессия практики', () => {
  it('константы темпа', () => {
    expect(NEW_PER_DAY).toBe(20)
    expect(SESSION_LIMIT).toBe(60)
  })

  it('новые идут по темам, задания перемежаются с карточками, обратная ждёт прямую', async () => {
    const user = await getCurrentUser()
    const session = await buildSession(user.id, 'demo', 'review')
    // 4 прямые карточки и 4 задания; обратная карточка term-a~r не показывается, пока не изучена прямая.
    // Задачи на код из другой темы идут после первой темы — темы в порядке курса.
    expect(session.map((entry) => entry.item.id.split('#')[1])).toEqual(['term-a', 'qa-b', 'code-c', 'quiz-one', 'qa-d', 'quiz-many', 'out', 'ord', 'sum', 'bare', 'view'])
    expect(session.every((entry) => entry.status === 'new')).toBe(true)
    expect(session[0].intervals[1]).toBe('1 мин')
  })

  it('подошедшие повторения идут вперемешку с новыми, статусы изучения и повторения', async () => {
    const user = await getCurrentUser()
    const past = new Date(Date.now() - 60_000)
    await studied(user.id, 'term-a', past, 2)
    await studied(user.id, 'qa-b', past, 1)
    await studied(user.id, 'code-c', new Date(Date.now() + 86_400_000), 2)

    const session = await buildSession(user.id, 'demo', 'review')
    const keys = session.map((entry) => entry.item.id.split('#')[1])
    // Две подошедшие, затем новые. code-c ещё не подошла.
    expect(keys.slice(0, 2).sort()).toEqual(['qa-b', 'term-a'])
    expect(keys).not.toContain('code-c')
    const status = Object.fromEntries(session.map((entry) => [entry.item.id.split('#')[1], entry.status]))
    expect(status).toMatchObject({ 'term-a': 'review', 'qa-b': 'learning' })
  })

  it('обратная карточка: после прямой, но не в той же сессии, что прямая', async () => {
    const user = await getCurrentUser()
    // Прямая подошла — обратная в эту сессию не попадает, хоть и доступна: иначе одна подсказывает другую.
    await studied(user.id, 'term-a', new Date(Date.now() - 60_000))
    expect((await buildSession(user.id, 'demo', 'review')).map((entry) => entry.item.id)).not.toContain(id('term-a~r'))

    // Прямая отвечена и ждёт своего срока — теперь обратная приходит как новая.
    await db.reviewItem.update({ where: { userId_itemId: { userId: user.id, itemId: id('term-a') } }, data: { dueAt: new Date(Date.now() + 86_400_000) } })
    const session = await buildSession(user.id, 'demo', 'review')
    expect(session.find((entry) => entry.item.id === id('term-a~r'))?.status).toBe('new')
  })

  it('из пары подошедших прямой и обратной в сессии только одна', async () => {
    const user = await getCurrentUser()
    const past = new Date(Date.now() - 60_000)
    await studied(user.id, 'term-a', past)
    await studied(user.id, 'term-a~r', past)
    const pair = (await buildSession(user.id, 'demo', 'review')).filter((entry) => entry.item.id.startsWith(id('term-a')))
    expect(pair).toHaveLength(1)
  })

  it('прямая после «Снова» не вытесняется своей новой обратной', async () => {
    const user = await getCurrentUser()
    await studied(user.id, 'term-a', new Date(Date.now() + 60_000), 1)
    const keys = (await buildSession(user.id, 'demo', 'review')).map((entry) => entry.item.id.split('#')[1])
    expect(keys.at(-1)).toBe('term-a')
    expect(keys).not.toContain('term-a~r')
  })

  it('элементы на стадии изучения, которые подойдут в ближайшие 20 минут, берутся в конец сессии', async () => {
    const user = await getCurrentUser()
    expect(LEARN_AHEAD_MINUTES).toBe(20)
    const soon = (minutes: number) => new Date(Date.now() + minutes * 60_000)
    await studied(user.id, 'qa-b', soon(8), 1)
    await studied(user.id, 'qa-d', soon(3), 3)
    // На стадии повторения и далеко в будущем — не берутся.
    await studied(user.id, 'code-c', soon(5), 2)
    await studied(user.id, 'term-a', soon(40), 1)

    const keys = (await buildSession(user.id, 'demo', 'review')).map((entry) => entry.item.id.split('#')[1])
    // Сначала новые, затем взятые заранее — по сроку.
    expect(keys.slice(-2)).toEqual(['qa-d', 'qa-b'])
    expect(keys).not.toContain('code-c')
    expect(keys).not.toContain('term-a')
    // Счётчик на кнопке совпадает с длиной сессии.
    expect((await getReviewCounts(user.id, 'demo')).ready).toBe(keys.length)
  })

  it('лимит новых в день учитывает уже начатые сегодня', async () => {
    const user = await getCurrentUser()
    const later = new Date(Date.now() + 86_400_000)
    for (let i = 0; i < NEW_PER_DAY; i++) {
      await db.reviewItem.create({
        data: { userId: user.id, itemId: `other#${i}`, kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', dueAt: later, reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 },
      })
    }
    expect(await buildSession(user.id, 'demo', 'review')).toEqual([])
    expect((await getReviewCounts(user.id, 'demo')).freshToday).toBe(0)
  })

  it('если новых нет, подошедшие идут подряд', async () => {
    const user = await getCurrentUser()
    const past = new Date(Date.now() - 60_000)
    for (const key of ['term-a', 'qa-b', 'code-c', 'qa-d']) await studied(user.id, key, past)
    for (let i = 0; i < NEW_PER_DAY; i++) {
      await db.reviewItem.create({
        data: { userId: user.id, itemId: `other#${i}`, kind: 'card', stability: 1, stabilityFast: 1, difficulty: 5, state: 2, scheduleStatus: 'review', dueAt: new Date(Date.now() + 86_400_000), reps: 1, lapses: 0, scheduledDays: 1, learningStep: 0 },
      })
    }
    const session = await buildSession(user.id, 'demo', 'review')
    expect(session.map((entry) => entry.item.id.split('#')[1]).sort()).toEqual(['code-c', 'qa-b', 'qa-d', 'term-a'])
    expect(session.every((entry) => entry.status === 'review')).toBe(true)
  })

  it('фильтр по видам', async () => {
    const user = await getCurrentUser()
    const session = await buildSession(user.id, 'demo', 'review', TOPIC, ['output'])
    expect(session.map((entry) => entry.item.kind)).toEqual(['output'])
  })

  it('свободная тренировка: все элементы ветки, без учёта расписания', async () => {
    const user = await getCurrentUser()
    await studied(user.id, 'term-a', new Date(Date.now() + 86_400_000))
    const session = await buildSession(user.id, 'demo', 'free', TOPIC)
    expect(session).toHaveLength(9)
    expect(session.every((entry) => entry.status === 'new')).toBe(true)
  })

  it('варианты квиза перемешиваются, а у задачи на порядок не бывает уже решённого порядка', async () => {
    const user = await getCurrentUser()
    // Math.random близко к 1 оставляет перестановку тождественной — так проверяется повторное перемешивание.
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const session = await buildSession(user.id, 'demo', 'review', TOPIC, ['order'])
    const order = session[0].item as OrderItem
    // Все 5 попыток дали тот же порядок — шаги отдаются как есть, бесконечного цикла нет.
    expect(order.steps).toEqual(['Один', 'Два', 'Три'])

    vi.spyOn(Math, 'random').mockReturnValue(0)
    const shuffled = (await buildSession(user.id, 'demo', 'review', TOPIC, ['order']))[0].item as OrderItem
    expect(shuffled.steps).not.toEqual(['Один', 'Два', 'Три'])
    expect([...shuffled.steps].sort()).toEqual(['Два', 'Один', 'Три'])
  })

  it('счётчики ветки', async () => {
    const user = await getCurrentUser()
    await studied(user.id, 'term-a', new Date(Date.now() - 1000))
    await studied(user.id, 'qa-b', new Date(Date.now() + 86_400_000))
    const counts = await getReviewCounts(user.id, 'demo', TOPIC)
    // Новых 7, но обратная term-a~r не войдёт в сессию вместе с подошедшей прямой term-a — поэтому 6.
    expect(counts).toEqual({
      total: 9,
      byKind: { card: 5, quiz: 2, output: 1, order: 1, code: 0, types: 0, react: 0 },
      studied: 2,
      due: 1,
      freshToday: 6,
      ready: 7,
    })
    expect((await getReviewCounts(user.id, 'demo', 'demo/other')).byKind).toMatchObject({ code: 2, react: 1 })
  })

  it('эталон и разбор задачи на код не уходят в сессию', async () => {
    const user = await getCurrentUser()
    for (const mode of ['review', 'free'] as const) {
      const [entry] = await buildSession(user.id, 'demo', mode, 'demo/other/solo', ['code'])
      const task = entry.item as CodeItem
      expect(task.solution).toBe('')
      expect(task.explain).toBe('')
      expect(task.tests).toContain('test(')
    }
  })
})
