import type { ReviewItem } from '@prisma/client'
import { describe, expect, it } from 'vitest'
import { formatInterval, fromSchedulerCard, getScheduler, GRADES, previewIntervals, toSchedulerCard } from '@/entities/schedule/model/srs'

const now = new Date('2026-11-08T10:00:00Z')
const after = (ms: number) => new Date(now.getTime() + ms)
const MIN = 60_000
const DAY = 24 * 60 * MIN

describe('интервальное повторение', () => {
  it('оценки FSRS', () => {
    expect(GRADES).toEqual([1, 2, 3, 4])
  })

  it('подписывает сроки словами', () => {
    expect(formatInterval(now, now)).toBe('через минуту')
    expect(formatInterval(now, after(10 * MIN))).toBe('через 10 минут')
    expect(formatInterval(now, after(2 * MIN))).toBe('через 2 минуты')
    expect(formatInterval(now, after(60 * MIN))).toBe('через час')
    expect(formatInterval(now, after(3 * 60 * MIN))).toBe('через 3 часа')
    expect(formatInterval(now, after(DAY))).toBe('завтра')
    expect(formatInterval(now, after(5 * DAY))).toBe('через 5 дней')
    expect(formatInterval(now, after(14 * DAY))).toBe('через 2 недели')
    expect(formatInterval(now, after(28 * DAY))).toBe('через 4 недели')
    expect(formatInterval(now, after(31 * DAY))).toBe('через месяц')
    expect(formatInterval(now, after(90 * DAY))).toBe('через 3 месяца')
    expect(formatInterval(now, after(548 * DAY))).toBe('через 1,5 г.')
    expect(formatInterval(now, after(730 * DAY))).toBe('через 2 г.')
  })

  it('карточка планировщика и строка базы переводятся друг в друга без потерь', async () => {
    const scheduler = await getScheduler()
    const reviewed = scheduler.review({ card: scheduler.newCard({ now, cardId: 'x#y' }), grade: 3, now }).card
    const fields = fromSchedulerCard(reviewed)
    const row = { userId: 'u', itemId: 'x#y', kind: 'card', createdAt: now, updatedAt: now, ...fields } as ReviewItem
    expect(toSchedulerCard(row)).toMatchObject({ cardId: 'x#y', ...fields })
    // Без lastReviewAt поле становится null, а не undefined.
    expect(fromSchedulerCard({ ...reviewed, lastReviewAt: undefined } as unknown as typeof reviewed).lastReviewAt).toBeNull()
  })

  it('показывает интервалы для новой и для уже изученной карточки', async () => {
    const fresh = await previewIntervals(null, 'x#y', now)
    expect(fresh[1]).toBe('через минуту')
    expect(fresh[3]).toMatch(/^(завтра|через \d+ (дня|дней))$/)

    const scheduler = await getScheduler()
    const card = scheduler.review({ card: scheduler.newCard({ now, cardId: 'x#y' }), grade: 3, now }).card
    const row = { userId: 'u', itemId: 'x#y', kind: 'card', createdAt: now, updatedAt: now, ...fromSchedulerCard(card) } as ReviewItem
    const later = await previewIntervals(row, 'x#y', card.dueAt)
    expect(Object.keys(later)).toEqual(['1', '2', '3', '4'])
    expect(later[4]).not.toBe('')
  })
})
