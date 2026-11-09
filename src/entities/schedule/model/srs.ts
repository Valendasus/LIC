import type { ReviewItem } from '@prisma/client'
import { DefaultScheduler, Rating } from 'ts-fsrs'
import { count } from '@/shared/lib'

/**
 * Интервальное повторение на FSRS-7 (ts-fsrs 6).
 * Цель — 90 % вспоминания; «Снова» возвращает элемент через 1 и 10 минут, затем расписание ведёт FSRS.
 */
const schedulerPromise = DefaultScheduler({
  desiredRetention: 0.9,
  enableShortTerm: true,
  learningSteps: ['1m', '10m'],
  relearningSteps: ['10m'],
  enableFuzz: true,
  maximumInterval: 3650,
})

export type Grade = 1 | 2 | 3 | 4
export const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]

type Scheduler = Awaited<typeof schedulerPromise>
type SchedulerCard = ReturnType<Scheduler['newCard']>

export async function getScheduler() {
  return schedulerPromise
}

/** Строка из базы → карточка планировщика. Даты должны быть объектами Date. */
export function toSchedulerCard(row: ReviewItem): SchedulerCard {
  return {
    cardId: row.itemId,
    stability: row.stability,
    stabilityFast: row.stabilityFast,
    difficulty: row.difficulty,
    state: row.state,
    scheduleStatus: row.scheduleStatus,
    dueAt: row.dueAt,
    lastReviewAt: row.lastReviewAt,
    reps: row.reps,
    lapses: row.lapses,
    scheduledDays: row.scheduledDays,
    learningStep: row.learningStep,
  } as SchedulerCard
}

/** Карточка планировщика → поля строки в базе. */
export function fromSchedulerCard(card: SchedulerCard) {
  return {
    stability: card.stability,
    stabilityFast: card.stabilityFast,
    difficulty: card.difficulty,
    state: card.state,
    scheduleStatus: card.scheduleStatus,
    dueAt: card.dueAt,
    lastReviewAt: card.lastReviewAt ?? null,
    reps: card.reps,
    lapses: card.lapses,
    scheduledDays: card.scheduledDays,
    learningStep: card.learningStep,
  }
}

/** Срок словами для кнопок оценки: «через минуту», «через 2 дня», «через 2 недели». */
export function formatInterval(from: Date, to: Date) {
  const minutes = Math.max(1, Math.round((to.getTime() - from.getTime()) / 60_000))
  if (minutes === 1) return 'через минуту'
  if (minutes < 60) return `через ${count(minutes, ['минуту', 'минуты', 'минут'])}`
  const hours = Math.round(minutes / 60)
  if (hours === 1) return 'через час'
  if (hours < 24) return `через ${count(hours, ['час', 'часа', 'часов'])}`
  const days = Math.round(hours / 24)
  if (days === 1) return 'завтра'
  if (days < 14) return `через ${count(days, ['день', 'дня', 'дней'])}`
  if (days < 31) return `через ${count(Math.round(days / 7), ['неделю', 'недели', 'недель'])}`
  const months = Math.round(days / 30)
  if (months < 12) return months === 1 ? 'через месяц' : `через ${count(months, ['месяц', 'месяца', 'месяцев'])}`
  return `через ${(days / 365).toFixed(1).replace('.', ',').replace(',0', '')} г.`
}

/** Когда элемент вернётся при каждой из четырёх оценок. */
export async function previewIntervals(row: ReviewItem | null, itemId: string, now: Date) {
  const scheduler = await getScheduler()
  const card = row ? toSchedulerCard(row) : scheduler.newCard({ now, cardId: itemId })
  const result: Record<Grade, string> = { 1: '', 2: '', 3: '', 4: '' }
  for (const item of scheduler.preview({ card, now })) {
    result[item.grade as Grade] = formatInterval(now, item.card.dueAt)
  }
  return result
}
